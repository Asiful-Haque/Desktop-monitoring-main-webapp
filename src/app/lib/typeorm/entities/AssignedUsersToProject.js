// src/lib/typeorm/entities/AssignedUsersToProjects.ts
import { EntitySchema } from "typeorm";

export const AssignedUsersToProjects = new EntitySchema({
  name: "AssignedUsersToProjects",
  tableName: "assigned_users_to_projects",
  columns: {
    user_id: {
      primary: true,
      type: "int",
    },
    project_id: {
      primary: true,
      type: "int",
    },
    assigned_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
    },
  },
  relations: {
    user_rel: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id", referencedColumnName: "user_id" },
      inverseSide: "assigned_users_rel", // will add in User entity
    },
    project_rel: {
      type: "many-to-one",
      target: "Project",
      joinColumn: { name: "project_id", referencedColumnName: "project_id" },
      inverseSide: "assigned_users_rel", // will add in Project entity
    },
  },
});
