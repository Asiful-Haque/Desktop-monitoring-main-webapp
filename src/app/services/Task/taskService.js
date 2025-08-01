// app/services/Task/taskService.js
import pool from "@/app/lib/sqlClient";
import { Task } from "@/app/lib/typeorm/entities/Task";
import { initDb } from "@/app/lib/typeorm/init-db";

export class TaskService {
  constructor() {
    this.userRepo = null;
  }

  async initializeRepository() {
    if (!this.userRepo) {
      const dataSource = await initDb();
      this.userRepo = dataSource.getRepository(Task);
    }
    return this.userRepo;
  }

  async getAllTasks(userId) {
    const repo = await this.initializeRepository();

    return await repo
      .createQueryBuilder("task")
      .leftJoin("task.assigned_to_rel", "user")
      .where("task.assigned_to = :userId", { userId })
      .select([
        "task.task_id",
        "task.task_name",
        "task.task_description",
        "user.user_id",
        "user.username",
      ])
      .getMany();
  }
}
