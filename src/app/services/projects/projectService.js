// app/services/project/projectService.ts
import pool from "@/app/lib/sqlClient";

export default class ProjectService {
  async getAllProjects() {
    const [rows] = await pool.execute(`
      SELECT * FROM projects 
    `);
    return rows;
  }

  async createProject({ title, description, deadline, status, email }) {
    const [rows] = await pool.execute(`SELECT id FROM users WHERE email = ?`, [
      email,
    ]);

    if (rows.length === 0) {
      throw new Error("User not found");
    }

    const created_by = rows[0].id;

    const [result] = await pool.execute(
      `INSERT INTO projects (title, description, deadline, status, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, deadline, status, created_by]
    );

    return {
      id: result.insertId,
      title,
      description,
      deadline,
      status,
      created_by,
    };
  }
}
