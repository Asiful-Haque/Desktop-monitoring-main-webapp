// src/services/transactionData/transactionService.js

import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { PaymentLog } from "@/app/lib/typeorm/entities/PaymentLog";
import { TimeTracking } from "@/app/lib/typeorm/entities/TimeTracking";
import { Transaction } from "@/app/lib/typeorm/entities/Transaction";
import { In } from "typeorm";

export class TransactionService {
  async repo() {
    const ds = await getDataSource();
    return ds.getRepository(Transaction);
  }

  async getLastTransactionNumber() {
    const ds = await getDataSource();
    try {
      const lastTransaction = await ds
        .getRepository(Transaction)
        .createQueryBuilder("t")
        .select("t.transaction_number")
        .orderBy("t.id", "DESC")
        .take(1)
        .getRawOne();

      return lastTransaction
        ? lastTransaction.t_transaction_number
        : "Trx_tnt1_0";
    } catch (error) {
      console.error("❌ Error fetching last transaction:", error);
      throw new Error("Failed to retrieve last transaction");
    }
  }

  async createTransaction({
    transaction_number,
    hours,
    payment_of_transaction,
    developer_id,
    status,
  }) {
    const ds = await getDataSource();
    const repo = await this.repo();

    try {
      const newTransaction = repo.create({
        transaction_number,
        hour: hours,
        payment_of_transaction,
        developer_id,
        status: status || "pending",
      });

      await repo.save(newTransaction);
      return newTransaction;
    } catch (error) {
      console.error("❌ Error creating transaction:", error);
      throw new Error("Failed to create transaction");
    }
  }

  async findHistoryData({ developerId } = {}) {
    const ds = await getDataSource();

    const qb = ds
      .getRepository(Transaction)
      .createQueryBuilder("t")
      // if you have the relation defined (recommended; see entity snippet below)
      .leftJoin("t.developer_rel", "u")
      .addSelect(["u.user_id", "u.username"])
      .where("t.status IN (:...statuses)", {
        statuses: ["pending", "rejected", "paid"],
      })
      .orderBy("t.created_at", "ASC")
      .addOrderBy("t.id", "ASC");

    if (developerId) {
      qb.andWhere("t.developer_id = :developerId", { developerId });
    }

    const { entities } = await qb.getRawAndEntities();

    return entities.map((t) => ({
      id: t.id,
      transaction_number: t.transaction_number,
      hour: t.hour,
      payment_of_transaction: t.payment_of_transaction,
      developer_id: t.developer_id,
      developer_name: t.developer_rel ? t.developer_rel.username : null,
      status: t.status,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  }

  //admin parts
  async getPendingDatoForAdminToPayorReject() {
    const ds = await getDataSource();
    const repo = ds.getRepository(Transaction);

    const qb = repo
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.developer_rel", "developer") // keep your dev join
      .leftJoin("developer.user_roles_rel", "ur") // join user_roles
      .leftJoin("ur.role_rel", "role") // join roles
      .select([
        "transaction.id",
        "transaction.transaction_number",
        "transaction.status",
        "transaction.payment_of_transaction",
        "transaction.hour",
        "transaction.created_at",
        "transaction.updated_at",
        "developer.username",
      ])
      .addSelect("role.role_name", "dev_role") // grab role name
      .where("transaction.status = :status", { status: "pending" });

    const { entities, raw } = await qb.getRawAndEntities();

    // Map transaction.id -> role_name (first hit wins)
    const roleByTxnId = new Map();
    for (const r of raw) {
      const txnId = r["transaction_id"];
      if (!roleByTxnId.has(txnId)) {
        roleByTxnId.set(txnId, r["dev_role"] || null);
      }
    }

    // stitch role onto developer_rel.role (naming unchanged)
    const pending = entities.map((t) => ({
      ...t,
      developer_rel: t.developer_rel
        ? { ...t.developer_rel, role: roleByTxnId.get(t.id) || null }
        : t.developer_rel,
    }));

    return pending;
  }
  async findByTransactionNumber(transaction_number) {
    const repo = await this.repo();
    return repo.findOne({ where: { transaction_number } });
  }
  async rejectTransaction(transaction_number) {
    const repo = await this.repo();

    // Step 1: Find the transaction by its transaction_number
    const existing = await this.findByTransactionNumber(transaction_number);
    if (!existing) throw new Error("Transaction not found");

    // Step 2: Update the transaction status to "rejected"
    await repo.update({ transaction_number }, { status: "rejected" });

    // Step 3: Find the related payment logs to get serial_ids
    const ds = await getDataSource();
    const paymentLogRepo = ds.getRepository(PaymentLog);
    const paymentLogs = await paymentLogRepo.find({
      where: { transaction_number },
    });

    // Step 4: Extract serial_ids from payment logs
    const serialIds = paymentLogs.map((log) => log.serial_id);

    // Step 5: Update flagger to 0 for the related time tracking records
    if (serialIds.length > 0) {
      const timeTrackingRepo = ds.getRepository(TimeTracking);
      await timeTrackingRepo.update(
        { serial_id: In(serialIds) },
        { flagger: 0 }
      );
    }

    // Step 6: Return the updated transaction with its latest status
    return this.findByTransactionNumber(transaction_number);
  }
  async acceptTransaction(transaction_number) {
    const repo = await this.repo();

    // Step 1: Find the transaction by its transaction_number
    const existing = await this.findByTransactionNumber(transaction_number);
    if (!existing) throw new Error("Transaction not found");

    // Step 2: Update the transaction status to "paid"
    await repo.update({ transaction_number }, { status: "paid" });

    // Step 3: Find the related payment logs to get serial_ids
    const ds = await getDataSource(); // Initialize the DataSource
    const paymentLogRepo = ds.getRepository(PaymentLog); // Get the PaymentLog repository
    const paymentLogs = await paymentLogRepo.find({
      where: { transaction_number },
    });

    // Step 4: Extract serial_ids from payment logs
    const serialIds = paymentLogs.map((log) => log.serial_id);

    // Step 5: Update flagger to 2 for the related time tracking records
    if (serialIds.length > 0) {
      const timeTrackingRepo = ds.getRepository(TimeTracking); // Get the TimeTracking repository
      await timeTrackingRepo.update(
        { serial_id: In(serialIds) }, // Use "In" to match multiple serial_ids
        { flagger: 2 } // Set flagger to 2
      );
    }

    // Step 6: Return the updated transaction with its latest status
    return this.findByTransactionNumber(transaction_number);
  }
}
