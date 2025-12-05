// src/lib/typeorm/entities/UserRole.ts
import { EntitySchema } from "typeorm";

export const UserRoles = new EntitySchema({
  name: "UserRoles",
  tableName: "user_roles",
  columns: {
    tenant_id: {
      primary: true,
      type: "int",
    },
    user_id: {
      primary: true,
      type: "int",
    },
    role_id: {
      primary: true,
      type: "int",
    },
    currency: {
      type: "varchar",
      length: 255,
      nullable: true,
      default: null,
    },
  },
  relations: {
    tenant_rel: {
      type: "many-to-one",
      target: "Tenant",
      joinColumn: { name: "tenant_id" },
      inverseSide: "user_roles_rel",
      onDelete: "CASCADE",
    },
    user_rel: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id" },
      inverseSide: "user_roles_rel",
    },
    role_rel: {
      type: "many-to-one",
      target: "Role",
      joinColumn: { name: "role_id" },
      inverseSide: "user_roles_rel",
    },
  },
});

// // src/lib/typeorm/entities/UserRole.ts
// import { EntitySchema } from "typeorm";

// export const UserRoles = new EntitySchema({
//   name: "UserRoles",
//   tableName: "user_roles",
//   columns: {
//     tenant_id: { primary: true, type: "int" }, // NEW + part of PK
//     user_id: { primary: true, type: "int" }, // already PK
//     role_id: { primary: true, type: "int" }, // already PK
//     // (no timestamps needed unless you want them)
//   },
//   relations: {
//     tenant_rel: {
//       type: "many-to-one",
//       target: "Tenant",
//       joinColumn: { name: "tenant_id" },
//       inverseSide: "user_roles_rel",
//       onDelete: "CASCADE",
//     },
//     user_rel: {
//       type: "many-to-one",
//       target: "User",
//       joinColumn: { name: "user_id" },
//       inverseSide: "user_roles_rel",
//       onDelete: "CASCADE",
//     },
//     role_rel: {
//       type: "many-to-one",
//       target: "Role",
//       joinColumn: { name: "role_id" },
//       inverseSide: "user_roles_rel",
//       onDelete: "CASCADE",
//     },
//   },
//   // Optional: if you *also* want to prevent duplicate roles by name per tenant,
//   // create unique indices via a migration (shown below).
// });
