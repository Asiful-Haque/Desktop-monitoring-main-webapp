// src/lib/typeorm/entities/UserRole.ts
import { EntitySchema } from "typeorm";

export const UserRoles = new EntitySchema({
  name: "UserRoles",
  tableName: "user_roles",
  columns: {
    user_id: {
      primary: true,
      type: "int",
    },
    role_id: {
      primary: true,
      type: "int",
    },
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id" },
      inverseSide: "user_roles",
    },
    role: {
      type: "many-to-one",
      target: "Role",
      joinColumn: { name: "role_id" },
      inverseSide: "user_roles",
    },
  },
});
