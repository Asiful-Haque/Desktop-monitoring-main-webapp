// src/lib/typeorm/entities/TimeTracking.ts
import { EntitySchema } from "typeorm";

export const TimeTracking = new EntitySchema({
  name: "TimeTracking",
  tableName: "time_tracking",
  columns: {
    serial_id: { primary: true, type: "int", generated: "increment" },
    task_id: { type: "int", nullable: false },
    project_id: { type: "int", nullable: false },
    tenant_id: { type: "int", default: 0, nullable: false },
    developer_id: { type: "int", nullable: true },
    work_date: { type: "date", nullable: false },
    task_start: { type: "datetime", nullable: false },
    task_end: { type: "datetime", nullable: true },
    duration: { type: "int", nullable: true, unsigned: true },
    session_payment: {
      type: "decimal",
      precision: 12,
      scale: 2,
      default: 0,
      nullable: false,
    },
    flagger: { type: "int", default: 0, nullable: false },

    created_at: { type: "timestamp", default: () => "CURRENT_TIMESTAMP" },
    updated_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
      onUpdate: "CURRENT_TIMESTAMP",
    },
  },
  relations: {
    project_rel: {
      type: "many-to-one",
      target: "Project",
      joinColumn: { name: "project_id", referencedColumnName: "project_id" },
      inverseSide: "time_trackings_rel",
      onDelete: "CASCADE",
    },
    developer_rel: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "developer_id", referencedColumnName: "user_id" },
      inverseSide: "time_trackings_rel",
      onDelete: "SET NULL",
    },
    task_rel: {
      type: "many-to-one",
      target: "Task",
      joinColumn: { name: "task_id", referencedColumnName: "task_id" },
      inverseSide: "time_trackings_rel",
      onDelete: "CASCADE",
    },
    payment_logs_rel: {
      type: "one-to-many",
      target: "PaymentLog",
      inverseSide: "time_tracking_rel",
    },
  },
});
