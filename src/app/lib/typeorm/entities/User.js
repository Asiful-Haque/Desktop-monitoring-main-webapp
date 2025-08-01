// src/lib/typeorm/entities/User.ts
import { EntitySchema } from "typeorm";
// import { UserRoles } from "./UserRole";

export const User = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    user_id: {
      primary: true,
      type: "int",
      generated: true,
    },
    username: {
      type: "varchar",
      length: 150,
    },
    email: {
      type: "varchar",
      length: 255,
      unique: true,
    },
    password: {
      type: "varchar",
      length: 255,
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
  relations: {
    user_roles_rel: {
      type: "one-to-many",
      target: "UserRoles",
      inverseSide: "user_rel",
    },
    projects_rel: {
      type: "one-to-many",
      target: "Project",
      inverseSide: "assigned_to_rel",
    },
    tasks_rel: {
      type: "one-to-many",
      target: "Task",
      inverseSide: "assigned_to_rel",
    },
  },
});
