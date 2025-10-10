// src/lib/typeorm/entities/Transaction.ts
import { EntitySchema } from "typeorm";

export const Transaction = new EntitySchema({
  name: "Transaction",
  tableName: "transactions",
  columns: {
    id: { primary: true, type: "int", generated: true },
    transaction_number: { type: "varchar", length: 255, unique: true },
    hour: { type: "int" }, 
    payment_of_transaction: { type: "decimal", precision: 10, scale: 2 }, 
    developer_id: { type: "int" },
    status: { type: "varchar", length: 32, default: "pending" }, 
    created_at: { type: "timestamp", default: () => "CURRENT_TIMESTAMP" },
    updated_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
      onUpdate: "CURRENT_TIMESTAMP",
    },
  },
  relations: {
    developer_rel: {
      type: "many-to-one",
      target: "User", 
      joinColumn: { name: "developer_id", referencedColumnName: "user_id" }, 
      inverseSide: "transactions_rel", 
    },
    payment_logs_rel: {
      type: "one-to-many",
      target: "PaymentLog", 
      inverseSide: "transaction_rel",
    },
  },
});
