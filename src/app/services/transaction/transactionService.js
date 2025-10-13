// src/services/transactionData/transactionService.js

import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { Transaction } from "@/app/lib/typeorm/entities/Transaction";

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

      return lastTransaction ? lastTransaction.t_transaction_number : null;
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

  async findPendingTransactions({ developerId } = {}) {
    const ds = await getDataSource();

    const qb = ds
      .getRepository(Transaction)
      .createQueryBuilder("t")
      // if you have the relation defined (recommended; see entity snippet below)
      .leftJoin("t.developer_rel", "u")
      .addSelect(["u.user_id", "u.username"])
      .where("t.status IN (:...statuses)", { statuses: ["pending", "rejected", "paid"] })
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
}
