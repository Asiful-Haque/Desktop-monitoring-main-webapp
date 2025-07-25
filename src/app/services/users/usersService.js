import pool from "@/app/lib/sqlClient";

export default class UsersService {
    async getAllUsers() {
        const [rows] = await pool.execute(`
            SELECT username, email, role FROM users
        `);
        return rows;
    }

    async createUser( username, email, role ) {
        const [result] = await pool.execute(`
            INSERT INTO users (username, email, role)
            VALUES (?, ?, ?)
        `, [username, email, role]);

        return { id: result.insertId, username, email, role };
    }
}