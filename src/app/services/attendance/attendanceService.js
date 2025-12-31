// src/app/services/attendance/attendanceService.js
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";

const ALLOWED_STATUS = new Set([
  "present",
  "absent",
  "late",
  "half_day",
  "leave",
  "holiday",
  "weekend",
]);

export class AttendanceService {
  toMidnight(attendance_day) {
    if (!attendance_day) throw new Error("attendance_day is required");

    // If "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(attendance_day))) {
      return `${attendance_day} 00:00:00`;
    }

    // If datetime string or Date
    const d = new Date(attendance_day);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid attendance_day");

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} 00:00:00`;
  }

  normalizeEntry(e) {
    const user_id = Number(e?.user_id);
    if (!user_id) throw new Error("user_id is required");

    const status = String(e?.status || "").trim();
    if (!status) throw new Error("status is required");
    if (!ALLOWED_STATUS.has(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const attendance_day = this.toMidnight(e?.attendance_day);

    const check_in_time = e?.check_in_time ?? null;
    const check_out_time = e?.check_out_time ?? null;
    const notes = e?.notes ?? null;

    return { user_id, attendance_day, status, check_in_time, check_out_time, notes };
  }

  async upsertAttendance({ tenant_id, editor_user_id, entries }) {
    const ds = await getDataSource();
    const now = new Date();

    const normalized = entries.map((e) => this.normalizeEntry(e));
    if (!normalized.length) throw new Error("No entries provided");

    const cols = [
      "tenant_id",
      "user_id",
      "attendance_day",
      "status",
      "check_in_time",
      "check_out_time",
      "notes",
      "last_updated_by",
      "created_at",
      "updated_at",
    ];

    const valuesPlaceholders = normalized
      .map(() => `(${cols.map(() => "?").join(",")})`)
      .join(",");

    const insertSql = `
      INSERT INTO attendance_daily (${cols.join(",")})
      VALUES ${valuesPlaceholders}
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        check_in_time = VALUES(check_in_time),
        check_out_time = VALUES(check_out_time),
        notes = VALUES(notes),
        last_updated_by = VALUES(last_updated_by),
        updated_at = VALUES(updated_at)
    `;

    const insertParams = [];
    for (const e of normalized) {
      insertParams.push(
        tenant_id,
        e.user_id,
        e.attendance_day,
        e.status,
        e.check_in_time,
        e.check_out_time,
        e.notes,
        editor_user_id,
        now,
        now
      );
    }

    await ds.query(insertSql, insertParams);

    // ✅ SELECT back using raw query (avoid TypeORM find() placeholder bug)
    const whereOr = normalized
      .map(() => `(tenant_id = ? AND user_id = ? AND attendance_day = ?)`)
      .join(" OR ");

    const selectSql = `
      SELECT *
      FROM attendance_daily
      WHERE ${whereOr}
      ORDER BY attendance_day ASC, user_id ASC
    `;

    const selectParams = [];
    for (const e of normalized) {
      selectParams.push(tenant_id, e.user_id, e.attendance_day);
    }

    const rows = await ds.query(selectSql, selectParams);

    return {
      count: normalized.length,
      rows: normalized.length === 1 ? (rows[0] || null) : rows,
    };
  }

  // Optional GET helper
  async getAttendance({ tenant_id, date, from, to, user_id }) {
    const ds = await getDataSource();

    let start;
    let end;

    if (date) {
      start = this.toMidnight(date);
      end = start;
    } else {
      if (!from || !to) throw new Error("Provide date or from+to");
      start = this.toMidnight(from);
      end = this.toMidnight(to);
    }

    const params = [tenant_id];

    let sql = `
      SELECT *
      FROM attendance_daily
      WHERE tenant_id = ?
        AND attendance_day BETWEEN ? AND ?
    `;
    params.push(start, end);

    if (user_id) {
      sql += ` AND user_id = ?`;
      params.push(Number(user_id));
    }

    sql += ` ORDER BY attendance_day ASC, user_id ASC`;

    return ds.query(sql, params);
  }
}
