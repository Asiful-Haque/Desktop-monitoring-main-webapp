// app/services/Task/taskService.js
import pool from "@/app/lib/sqlClient";

export class TaskService {
  async getAllTasks() {
    try {
      const [rows] = await pool.query("SELECT * FROM tasks");
      return rows;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }
  }

  async createTask(data) {
  try {
    const [result] = await pool.query(
      `INSERT INTO tasks 
        (project_name, assigned_to, created_by, title, description, status, priority, due_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        data.project_name,
        data.assigned_to,
        data.created_by,
        data.title,
        data.description || '',
        data.status ? data.status.toLowerCase().replace(/\s/g, '-') : 'pending',
        data.priority || null,
        data.due_date || null
      ]
    );
    return result; // contains insertId
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
}
}
