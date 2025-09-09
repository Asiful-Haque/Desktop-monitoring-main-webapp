import { EntitySchema } from "typeorm";

export const Task = new EntitySchema({
  name: "Task",
  tableName: "tasks",
  columns: {
    task_id: {
      primary: true,
      type: "int",
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
      type: "int",
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
      type: "int",
    },
    priority: {
      type: "varchar",
      length: 50,
      default: "MEDIUM",
    },
    tenant_id: {             
      type: "int",
      nullable: false,
    },
    last_timing: {
      type: "bigint",
      default: 0,
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
    screenshots_rel: {
      type: "one-to-many",
      target: "Screenshot",
      inverseSide: "task_rel",
    },
    tenant_rel: {             
      type: "many-to-one",
      target: "Tenant",
      joinColumn: {
        name: "tenant_id",
        referencedColumnName: "tenant_id",
      },
      inverseSide: "tasks_rel",
    },
    time_trackings_rel: { type: "one-to-many", target: "TimeTracking", inverseSide: "task_rel" },
  },
});
