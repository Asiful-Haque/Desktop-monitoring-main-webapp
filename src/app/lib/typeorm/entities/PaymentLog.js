// src/lib/typeorm/entities/PaymentLog.ts
import { EntitySchema } from "typeorm";

export const PaymentLog = new EntitySchema({
  name: "PaymentLog",
  tableName: "payment_logs",
  columns: {
    session_id: { primary: true, type: "int", generated: "increment" },
    date: { type: "varchar", length: 10 },  
    transaction_number: { type: "varchar", length: 255 },
    serial_id: { type: "int" },
  },
  relations: {
    transaction_rel: {
      type: "many-to-one",
      target: "Transaction",
      joinColumn: { name: "transaction_number", referencedColumnName: "transaction_number" },
      inverseSide: "payment_logs_rel",
    },
    time_tracking_rel: {
      type: "many-to-one",
      target: "TimeTracking",
      joinColumn: { name: "serial_id", referencedColumnName: "serial_id" },
      inverseSide: "payment_logs_rel",
    },
  },
});
