// src/app/services/paymentLog/paymentLogService.js
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";

export class PaymentLogService {
  async createPaymentLogs({ globalTransactionNumber, logs }) {
    const ds = await getDataSource();

    // Flatten input -> rows to insert (no session_id on purpose)
    const rows = [];
    for (const item of logs) {
      console.log("item in logsvvvvvvvvvvvvvvvvvvvv:", item);
      if (!item) continue;

      const { date, serial_ids = [], transaction_number: perItemTxn } = item;
      if (!date || !Array.isArray(serial_ids) || serial_ids.length === 0) continue;

      const txn = perItemTxn || globalTransactionNumber;
      if (!txn) continue;

      for (const sid of serial_ids) {
        rows.push({
          date,                     // keep as provided
          transaction_number: txn,
          serial_id: sid,
        });
      }
    }

    if (rows.length === 0) {
      return { insertedCount: 0, rows: [] };
    }

    // Insert. We only provide non-PK columns; DB will assign session_id (PK).
    await ds
      .createQueryBuilder()
      .insert()
      .into("payment_logs") // If you have an entity, replace with that entity
      .values(rows)
      .execute();

    return { insertedCount: rows.length, rows };
  }
}
