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
}
