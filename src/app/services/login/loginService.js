// app/services/login/loginService.ts
import pool from '@/app/lib/sqlClient';

export default class LoginService {
  async validateUser(email, password, role) {
    const [rows] = await pool.execute(
      `SELECT * FROM credentials WHERE email = ? AND role = ? LIMIT 1`,
      [email, role]
    );
    if (rows.length === 0) return null;
    const user = rows[0];

    if (user.password !== password) { //Here i will add hash later
      return null;
    }
    return user;
  }
}
