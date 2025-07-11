import pool from "@/app/lib/sqlClient";

export default class SignupService {
  async checkUserExists(email) {
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    return rows.length > 0;
  }

  async createUser(fullName, email, password, role) {
    await pool.execute(
      `INSERT INTO users (username, email, password, role, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [fullName, email, password, role]
    );
  }
}
