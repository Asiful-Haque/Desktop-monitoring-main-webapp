// app/services/Task/taskService.js
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { AssignedUsersToProjects } from "@/app/lib/typeorm/entities/AssignedUsersToProject";

import { Task } from "@/app/lib/typeorm/entities/Task";

export class TaskService {
  async setTask({ taskData, tenant_id }) {
    const ds = await getDataSource();
    const repo = ds.getRepository(Task);

    const newTask = repo.create({
      task_name: taskData.task_name,
      task_description: taskData.task_description || null,
      assigned_to: Number(taskData.assigned_to),
      start_date: taskData.start_date || null,
      deadline: taskData.deadline || null,
      status: taskData.status || "pending",
      project_id: Number(taskData.project_name),
      priority: taskData.priority || "MEDIUM",
      tenant_id: tenant_id,
    });
    const savedTask = await repo.save(newTask);
    return savedTask;
  }

  async updateTaskStatus({ taskId, newStatus }) {
    const ds = await getDataSource();
    const repo = ds.getRepository(Task);
    const task = await repo.findOne({ where: { task_id: Number(taskId) } });
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    task.status = newStatus;
    if (newStatus.toLowerCase() === "completed") {
      task.end_date = new Date(); // set end_date when completed
    } else {
      task.end_date = null; // clear end_date otherwise
    }
    const updatedTask = await repo.save(task);
    return updatedTask;
  }

  async updateTaskTiming({ taskId, last_timing }) {
    const ds = await getDataSource();
    const repo = ds.getRepository(Task);
    const task = await repo.findOne({ where: { task_id: Number(taskId) } });
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    task.last_timing = last_timing;
    const updatedTask = await repo.save(task);
    return updatedTask;
  }

  async allTaskForGraph() {
    const ds = await getDataSource();
    const repo = ds.getRepository(Task);

    return repo
      .createQueryBuilder("t")
      .innerJoin("t.project_rel", "p")
      .innerJoin("t.assigned_to_rel", "u")
      .select([
        "t.task_id        AS task_id",
        "t.task_name      AS task_name",
        "t.task_description AS task_description",
        "u.username       AS assigned_to",
        "u.user_id        AS assigned_to_id",
        "t.start_date     AS start_date",
        "t.deadline       AS deadline",
        "t.end_date       AS end_date",
        "t.status         AS status",
        "p.project_name   AS project_name",
        "t.priority       AS priority",
      ])
      .orderBy("t.start_date", "ASC")
      .getRawMany();
  }

  async getAllTasks({ userId, projectId, tenant_id }) {
    if ((userId && projectId) || (!userId && !projectId)) {
      throw new Error("Exactly one of userId or projectId must be provided");
    }
    const ds = await getDataSource();
    const repo = ds.getRepository(Task);
    const qb = repo
      .createQueryBuilder("task")
      .leftJoin("task.assigned_to_rel", "user")
      .leftJoin("task.project_rel", "project")
      .select([
        "task.task_id           AS task_id",
        "task.task_name         AS task_name",
        "task.task_description  AS task_description",
        "task.status            AS status",
        "task.priority          AS priority",
        "task.start_date        AS start_date",
        "task.deadline          AS deadline",
        "task.end_date          AS end_date",
        "task.last_timing       AS last_timing",
        "user.user_id           AS assigned_to",
        "user.username          AS assigned_to_name",
        "task.project_id        AS project_id",
        "project.project_name   AS project_name",
      ])
      .orderBy("task.start_date", "ASC");

    if (userId) {
      qb.where("task.assigned_to = :userId", {
        userId: Number(userId),
      }).andWhere("task.tenant_id = :tenant_id", { tenant_id });
    } else {
      qb.where("task.project_id = :projectId", {
        projectId: Number(projectId),
      }).andWhere("task.tenant_id = :tenant_id", { tenant_id });
    }

    return qb.getRawMany();
  }

  // app/services/Task/taskService.js
  async getAllTasksForSupremeUsers(userIdInput) {
    const ds = await getDataSource();
    const uid =
      typeof userIdInput === "string"
        ? parseInt(userIdInput, 10)
        : Number(userIdInput);
    if (!Number.isFinite(uid))
      throw new Error(`Invalid userId: ${JSON.stringify(userIdInput)}`);

    const qb = ds
      .getRepository(Task)
      .createQueryBuilder("task")
      .innerJoin("task.project_rel", "project")
      // 🔗 use the EntitySchema for the mapping table
      .leftJoin(
        AssignedUsersToProjects,
        "aup",
        "aup.project_id = project.project_id"
      )
      .leftJoin("task.assigned_to_rel", "user")
      .where("(aup.user_id = :uid OR project.assigned_to = :uid)", { uid })
      .distinct(true)
      .select([
        "task.task_id           AS task_id",
        "task.task_name         AS task_name",
        "task.task_description  AS task_description",
        "task.status            AS status",
        "task.priority          AS priority",
        "task.start_date        AS start_date",
        "task.deadline          AS deadline",
        "task.end_date          AS end_date",
        "user.user_id           AS assigned_to",
        "user.username          AS assigned_to_name",
        "project.project_id     AS project_id",
        "project.project_name   AS project_name",
      ])
      .orderBy("task.start_date", "ASC");

    // console.log(qb.getSql(), qb.getParameters());
    return qb.getRawMany();
  }
}
