import pool from "@/app/lib/sqlClient";

export default class UsersService {
    async getAllUsers() {
        const [rows] = await pool.execute(`
            SELECT username, email, role FROM users
        `);
        return rows;
    }
}