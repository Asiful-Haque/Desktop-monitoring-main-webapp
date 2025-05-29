// app/api/screenshot-data/ScreenshotDataService.js
import pool from "@/app/lib/sqlClient";

export class ScreenshotDataService {
  async createScreenshotData(data) {
    const [result] = await pool.execute(
      `INSERT INTO ss_data (screenshot_path, task, timestamp, idle_seconds, active_seconds, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        data.screenshotPath,
        data.task,
        data.timestamp,
        data.idleSeconds,
        data.activeSeconds,
      ]
    );
    return result.insertId;
  }

  async getAllScreenshotData() {
    const [rows] = await pool.execute(`SELECT * FROM ss_data ORDER BY created_at DESC`);
    return rows;
  }
}
