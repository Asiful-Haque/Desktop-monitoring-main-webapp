const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Screenshot",
  tableName: "screenshots",
  columns: {
    screenshot_id: {
      primary: true,
      type: "int",
      generated: true,
    },
    screenshot_path: {
      type: "varchar",
      length: 600, 
    },
    idle_seconds: {
      type: "int",
      default: 0,
    },
    active_seconds: {
      type: "int",
      default: 0,
    },
    created_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
    },
  },
  indices: [
    { name: "idx_screenshots_task_id", columns: ["task_rel"], sparse: false },
    { name: "idx_screenshots_created_at", columns: ["created_at"], sparse: false },
  ],
  relations: {
    task_rel: {
      type: "many-to-one",
      target: "Task", 
      joinColumn: { name: "task_id" },
      nullable: true, // allows null if screenshot is not linked to a task
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
      inverseSide: "screenshots_rel", // matches Task.screenshots_rel
    },
  },
});
