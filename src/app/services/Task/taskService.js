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

  async updateTaskStatus({ taskId, newStatus }) {
    console.log("Task id isssss ", taskId);
    const repo = await this.initializeRepository();

    const task = await repo.findOne({ where: { task_id: Number(taskId) } });
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    task.status = newStatus;
    task.end_date = new Date();

    const updatedTask = await repo.save(task);
    return updatedTask;
  }

  async allTaskForGraph() {
    const repo = await this.initializeRepository();

    return repo
      .createQueryBuilder("t")
      .innerJoin("t.project_rel", "p")
      .innerJoin("t.assigned_to_rel", "u")
      .select([
        "t.task_id        AS task_id",
        "t.task_name      AS task_name",
        "t.task_description AS task_description",
        "u.username       AS assigned_to", 
        "t.start_date     AS start_date",
        "t.deadline       AS deadline",
        "t.end_date       AS end_date",
        "t.status         AS status",
        "p.project_name   AS project_name", 
        "t.priority       AS priority",
      ])
      .orderBy("t.start_date", "ASC")
      .getRawMany(); // returns raw rows ready for graph
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
