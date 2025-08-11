import { EntitySchema } from "typeorm";

export const Project = new EntitySchema({
  name: "Project",
  tableName: "projects",
  columns: {
    project_id: {
      primary: true,
      type: "int",
      generated: "increment",
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
    status: {
      type: "varchar",
      length: 50,
    },
    created_at: {
      type: "datetime",
    },
    updated_at: {
      type: "datetime",
    },
    start_date: {
      type: "datetime",
    },
    deadline: {
      type: "datetime",
    },
    assigned_to: {
      type: "bigint",
    },
  },
  relations: {
    assigned_to_rel: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "assigned_to",
        referencedColumnName: "user_id",
      },
      inverseSide: "projects_rel",
    },
    tasks_rel: {
      type: "one-to-many",
      target: "Task",
      inverseSide: "project_rel",
    },
    assigned_users_rel: {
      type: "one-to-many",
      target: "AssignedUsersToProjects",
      inverseSide: "project_rel",
    },
  },
});
