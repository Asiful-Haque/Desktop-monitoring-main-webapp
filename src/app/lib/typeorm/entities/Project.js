// src/lib/typeorm/entities/Project.js
import { EntitySchema } from "typeorm";

export const Project = new EntitySchema({
  name: "Project",
  tableName: "projects",
  columns: {
    project_id: {
      primary: true,
      type: "bigint",
      generated: true,
    },
    project_name: {
      type: "varchar",
      length: 255,
    },
    project_description: {
      type: "varchar",
      length: 1000,
      nullable: true,
    },
    start_date: {
      type: "datetime",
    },
    deadline: {
      type: "datetime",
    },
  },
  relations: {
    assigned_to: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "assigned_to",
        referencedColumnName: "user_id",
      },
      inverseSide: "projects",
    },
  },
});
