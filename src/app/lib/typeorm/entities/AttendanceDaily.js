// src/app/lib/typeorm/entities/AttendanceDaily.js
import { EntitySchema } from "typeorm";

export const AttendanceDaily = new EntitySchema({
  name: "AttendanceDaily",
  tableName: "attendance_daily",
  columns: {
    attendance_id: {
      primary: true,
      type: "bigint",
      unsigned: true,
      generated: "increment",
    },

    tenant_id: { type: "int", nullable: false },
    user_id: { type: "int", nullable: false },

    // Always store as YYYY-MM-DD 00:00:00
    attendance_day: { type: "datetime", nullable: false },

    status: { type: "varchar", length: 20, nullable: false },

    check_in_time: { type: "time", nullable: true },
    check_out_time: { type: "time", nullable: true },
    notes: { type: "varchar", length: 255, nullable: true },

    last_updated_by: { type: "int", nullable: false },

    created_at: { type: "datetime", nullable: false },
    updated_at: { type: "datetime", nullable: false },
  },

  relations: {
    user_rel: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id", referencedColumnName: "user_id" },
    },
    last_updated_by_rel: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "last_updated_by", referencedColumnName: "user_id" },
    },
    tenant_rel: {
      type: "many-to-one",
      target: "Tenant",
      joinColumn: { name: "tenant_id", referencedColumnName: "tenant_id" },
    },
  },
});
