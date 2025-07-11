// app/services/project/projectService.ts
import pool from "@/app/lib/sqlClient";

export default class ProjectService {
  async getAllProjects() {
    const [rows] = await pool.execute(`
      SELECT * FROM projects 
    `);
    return rows;
  }

  async createProject({ title, description, status, created_by }) {
    const [result] = await pool.execute(
      `INSERT INTO projects (title, description, status, created_by) VALUES (?, ?, ?, ?)`,
      [title, description, status, created_by]
    );
    return { id: result.insertId, title, description, status, created_by };
  }
}
