// app/services/Task/taskService.js
import pool from "@/app/lib/sqlClient";
import { Task } from "@/app/lib/typeorm/entities/Task";
import { initDb } from "@/app/lib/typeorm/init-db";
import { NextResponse } from "next/server";

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

  async setTask(taskData) {
    const repo = await this.initializeRepository();

    const newTask = repo.create({
      task_name: taskData.task_name,
      task_description: taskData.task_description || null,
      assigned_to: Number(taskData.assigned_to),
      start_date: taskData.start_date || null,
      deadline: taskData.deadline || null,
      status: taskData.status || "pending",
      project_id: Number(taskData.project_name),
      priority: taskData.priority || "MEDIUM",
    });
    const savedTask = await repo.save(newTask);
    return savedTask;
  }

  async getAllTasks({ userId, projectId }) {
    // This is called from two functions
    // and the task is similar so optimized.
  // Ensure exactly one filter is provided
  if ((userId && projectId) || (!userId && !projectId)) {
    throw new Error("Exactly one of userId or projectId must be provided");
  }
    const repo = await this.initializeRepository();

    const qb = repo
      .createQueryBuilder("task")
      .leftJoin("task.assigned_to_rel", "user")
      .leftJoin("task.project_rel", "project")
      .select([
        "task.task_id",
        "task.task_name",
        "task.task_description",
        "task.status",
        "task.priority",
        "task.deadline",
        "user.user_id",
        "user.username",
        "project.project_id",
      ]);

      if (userId) {
        qb.where("task.assigned_to = :userId", { userId });
      } else if (projectId) {
        qb.where("task.project_id = :projectId", { projectId });
      }
    return qb.getMany();
  }
}
