// import { initDb } from "@/app/lib/typeorm/init-db";
// import Screenshot from "@/app/lib/typeorm/entities/Screenshot"; // adjust path if needed
// import { Task } from "@/app/lib/typeorm/entities/Task";

// export class ScreenshotDataService {
//   constructor() {
//     this.screenshotRepo = null;
//     this.taskRepo = null;
//   }

//   async initializeRepositories() {
//     if (!this.screenshotRepo || !this.taskRepo) {
//       const dataSource = await initDb();
//       this.screenshotRepo = dataSource.getRepository(Screenshot);
//       this.taskRepo = dataSource.getRepository(Task);
//     }
//   }

//   // Create new screenshot record
//   async createScreenshotData({
//     screenshotPath,
//     task_id,
//     timestamp, // "11:58:07 AM"
//     idleSeconds,
//     activeSeconds,
//   }) {
//     await this.initializeRepositories();
//     // Combine current date with the time string for maintaining with created_at column
//     let createdAt;
//     if (timestamp) {
//       const today = new Date();
//       const dateString = today.toISOString().split("T")[0]; // e.g. "2025-08-14"
//       createdAt = new Date(`${dateString} ${timestamp}`);
//     }
//     const screenshot = this.screenshotRepo.create({
//       screenshot_path: screenshotPath,
//       idle_seconds: idleSeconds,
//       active_seconds: activeSeconds,
//       created_at: createdAt, // if not provided, DB default CURRENT_TIMESTAMP will be used
//       task_rel: task_id ? { task_id: Number(task_id) } : null,
//     });
//     const savedScreenshot = await this.screenshotRepo.save(screenshot);
//     return savedScreenshot;
//   }

//   // Get all screenshots (latest first)
//   async getAllScreenshotData() {
//     await this.initializeRepositories();

//     return this.screenshotRepo
//       .createQueryBuilder("screenshot")
//       .leftJoin("screenshot.task_rel", "task")
//       .select([
//         "screenshot.screenshot_id AS screenshot_id",
//         "screenshot.screenshot_path AS screenshot_path",
//         "screenshot.idle_seconds AS idle_seconds",
//         "screenshot.active_seconds AS active_seconds",
//         "screenshot.created_at AS created_at",
//         "task.task_id AS task_id",
//         "task.task_name AS task_name",
//         "task.assigned_to AS assigned_to",
//         "task.status AS task_status",
//       ])
//       .orderBy("screenshot.created_at", "DESC")
//       .getRawMany();
//   }

//   // Get screenshots by task_id
//   async getScreenshotsByTask(taskId) {
//     await this.initializeRepositories();

//     return this.screenshotRepo
//       .createQueryBuilder("screenshot")
//       .leftJoin("screenshot.task_rel", "task")
//       .select([
//         "screenshot.screenshot_id AS screenshot_id",
//         "screenshot.screenshot_path AS screenshot_path",
//         "screenshot.idle_seconds AS idle_seconds",
//         "screenshot.active_seconds AS active_seconds",
//         "screenshot.created_at AS created_at",
//         "task.task_id AS task_id",
//         "task.task_name AS task_name",
//         "task.assigned_to AS assigned_to",
//         "task.status AS task_status",
//       ])
//       .where("task.task_id = :taskId", { taskId })
//       .orderBy("screenshot.created_at", "DESC")
//       .getRawMany();
//   }
// }









// app/services/screenshot/screenshotDataService.ts (or .js)
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import Screenshot from "@/app/lib/typeorm/entities/Screenshot"; // default export
import { Task } from "@/app/lib/typeorm/entities/Task";

export class ScreenshotDataService {
  // Create new screenshot record
  async createScreenshotData({
    screenshotPath,
    task_id,
    timestamp, // "11:58:07 AM"
    idleSeconds,
    activeSeconds,
  }) {
    const ds = await getDataSource();
    const screenshotRepo = ds.getRepository(Screenshot);

    // Combine current date with the time string for maintaining with created_at column
    let createdAt;
    if (timestamp) {
      const today = new Date();
      const dateString = today.toISOString().split("T")[0]; // e.g. "2025-08-14"
      createdAt = new Date(`${dateString} ${timestamp}`);
    }

    const screenshot = screenshotRepo.create({
      screenshot_path: screenshotPath,
      idle_seconds: idleSeconds,
      active_seconds: activeSeconds,
      created_at: createdAt, // if not provided, DB default CURRENT_TIMESTAMP will be used
      task_rel: task_id ? { task_id: Number(task_id) } : null,
    });

    const savedScreenshot = await screenshotRepo.save(screenshot);
    return savedScreenshot;
  }

  // Get all screenshots (latest first)
  async getAllScreenshotData() {
    const ds = await getDataSource();
    const screenshotRepo = ds.getRepository(Screenshot);

    return screenshotRepo
      .createQueryBuilder("screenshot")
      .leftJoin("screenshot.task_rel", "task")
      .select([
        "screenshot.screenshot_id AS screenshot_id",
        "screenshot.screenshot_path AS screenshot_path",
        "screenshot.idle_seconds AS idle_seconds",
        "screenshot.active_seconds AS active_seconds",
        "screenshot.created_at AS created_at",
        "task.task_id AS task_id",
        "task.task_name AS task_name",
        "task.assigned_to AS assigned_to",
        "task.status AS task_status",
      ])
      .orderBy("screenshot.created_at", "DESC")
      .getRawMany();
  }

  // Get screenshots by task_id
  async getScreenshotsByTask(taskId) {
    const ds = await getDataSource();
    const screenshotRepo = ds.getRepository(Screenshot);
    // (Task import remains to ensure entity is registered; not used directly here)
    ds.getRepository(Task);

    return screenshotRepo
      .createQueryBuilder("screenshot")
      .leftJoin("screenshot.task_rel", "task")
      .select([
        "screenshot.screenshot_id AS screenshot_id",
        "screenshot.screenshot_path AS screenshot_path",
        "screenshot.idle_seconds AS idle_seconds",
        "screenshot.active_seconds AS active_seconds",
        "screenshot.created_at AS created_at",
        "task.task_id AS task_id",
        "task.task_name AS task_name",
        "task.assigned_to AS assigned_to",
        "task.status AS task_status",
      ])
      .where("task.task_id = :taskId", { taskId })
      .orderBy("screenshot.created_at", "DESC")
      .getRawMany();
  }
}
