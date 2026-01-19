// src/lib/typeorm/entities/WebsiteTracking.ts
import { EntitySchema } from "typeorm";

export const WebsiteTracking = new EntitySchema({
  name: "WebsiteTracking",
  tableName: "website_tracking",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    user_id: {
      type: "int",
    },
    website_url: {
      type: "varchar",
      length: 255,
    },
    duration_seconds: {
      type: "int",
      default: 0,
    },
    tracking_date: {
      type: "date", // Stores YYYY-MM-DD
    },
    created_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
    },
    updated_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
      onUpdate: "CURRENT_TIMESTAMP",
    },
  },
  indices: [
    {
      name: "IDX_USER_WEBSITE_DATE",
      unique: true,
      columns: ["user_id", "website_url", "tracking_date"],
    },
  ],
  relations: {
    user_rel: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id" },
    },
  },
});