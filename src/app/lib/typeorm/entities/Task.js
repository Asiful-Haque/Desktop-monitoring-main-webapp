import { EntitySchema } from "typeorm";

export const Task = new EntitySchema({
  name: "Task",
  tableName: "tasks",
  columns: {
    task_id: {
      primary: true,
      type: "bigint",
      generated: true,
    },
    task_name: {
      type: "varchar",
      length: 255,
    },
    task_description: {
      type: "varchar",
      length: 1000,
      nullable: true,
    },
    assigned_to: {
      type: "bigint",
    },
    start_date: {
      type: "datetime",
    },
    deadline: {
      type: "datetime",
    },
    end_date: {
      type: "datetime",
      nullable: true,
    },
    status: {
      type: "varchar",
      length: 50,
    },
    project_id: {
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
      inverseSide: "tasks_rel",
    },
    project_rel: {
      type: "many-to-one",
      target: "Project",
      joinColumn: {
        name: "project_id",
        referencedColumnName: "project_id",
      },
      inverseSide: "tasks_rel",
    },
  },
});
