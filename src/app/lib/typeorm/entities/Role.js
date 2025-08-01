// src/lib/typeorm/entities/Role.ts
import { EntitySchema } from "typeorm";

export const Role = new EntitySchema({
  name: "Role",
  tableName: "roles",
  columns: {
    role_id: {
      primary: true,
      type: "int",
      generated: true,
    },
    role_name: {
      type: "varchar",
      length: 255,
    },
  },
  relations: {
    user_roles_rel: {
      type: "one-to-many",
      target: "UserRoles",
      inverseSide: "role_rel",
    },
  },
});
