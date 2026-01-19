// src/app/services/attendance/attendanceService.js
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { AttendanceDaily } from "@/app/lib/typeorm/entities/AttendanceDaily";

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
    // if (!attendance_day) throw new Error("attendance_day is required");
    // if (/^\d{4}-\d{2}-\d{2}$/.test(String(attendance_day))) {
    //   return `${attendance_day}T00:00:00Z`;
    // }
    // const d = new Date(attendance_day);
    // if (Number.isNaN(d.getTime())) throw new Error("Invalid attendance_day");

    // const yyyy = d.getUTCFullYear();
    // console.log("UTC Full Year:", yyyy);
    // const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    // console.log("UTC Month:", mm);
    // const dd = String(d.getUTCDate()).padStart(2, "0");
    // console.log("UTC Date:", dd);
    // return `${yyyy}-${mm}-${dd}T00:00:00Z`;  // UTC format
    if (typeof attendance_day !== "string")
      attendance_day = String(attendance_day);

    // If it already has timezone info, return as-is
    if (attendance_day.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(attendance_day))
      return attendance_day;

    return attendance_day + "Z";
  }
  // toMidnight2(attendance_day) {
  //   if (!attendance_day) throw new Error("attendance_day is required");

  //   // If "YYYY-MM-DD"
  //   if (/^\d{4}-\d{2}-\d{2}$/.test(String(attendance_day))) {
  //     return `${attendance_day} 00:00:00`;
  //   }

  //   // If datetime string or Date
  //   const d = new Date(attendance_day);
  //   if (Number.isNaN(d.getTime())) throw new Error("Invalid attendance_day");

  //   const yyyy = d.getFullYear();
  //   const mm = String(d.getMonth() + 1).padStart(2, "0");
  //   const dd = String(d.getDate()).padStart(2, "0");
  //   return `${yyyy}-${mm}-${dd} 00:00:00`;
  // }

  normalizeEntry(e) {
    const user_id = Number(e?.user_id);
    if (!user_id) throw new Error("user_id is required");

    const status = String(e?.status || "").trim();
    if (!status) throw new Error("status is required");
    if (!ALLOWED_STATUS.has(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    console.log("Raw attendance day before tomidnight:", e?.attendance_day);
    const attendance_day = this.toMidnight(e?.attendance_day);
    // const attendance_day = e.attendance_day;
    console.log("Normallleeeeeeeed attendance day:", attendance_day);

    const check_in_time = e?.check_in_time ?? null;
    const check_out_time = e?.check_out_time ?? null;
    const notes = e?.notes ?? null;

    return {
      user_id,
      attendance_day,
      status,
      check_in_time,
      check_out_time,
      notes,
    };
  }

  // async upsertAttendance({ tenant_id, editor_user_id, entries }) {
  //   const ds = await getDataSource();
  //   const now = new Date();

  //   const normalized = entries.map((e) => this.normalizeEntry(e));
  //   if (!normalized.length) throw new Error("No entries provided");
  //   console.log("Data to upsert:", normalized);
  //   console.log("Total entries to upsert:", normalized.length);

  //   const cols = [
  //     "tenant_id",
  //     "user_id",
  //     "attendance_day",
  //     "status",
  //     "check_in_time",
  //     "check_out_time",
  //     "notes",
  //     "last_updated_by",
  //     "created_at",
  //     "updated_at",
  //   ];

  //   const valuesPlaceholders = normalized
  //     .map(() => `(${cols.map(() => "?").join(",")})`)
  //     .join(",");

  //   const insertSql = `
  //     INSERT INTO attendance_daily (${cols.join(",")})
  //     VALUES ${valuesPlaceholders}
  //     ON DUPLICATE KEY UPDATE
  //       status = VALUES(status),
  //       check_in_time = VALUES(check_in_time),
  //       check_out_time = VALUES(check_out_time),
  //       notes = VALUES(notes),
  //       last_updated_by = VALUES(last_updated_by),
  //       updated_at = VALUES(updated_at)
  //   `;

  //   const insertParams = [];
  //   for (const e of normalized) {
  //     insertParams.push(
  //       tenant_id,
  //       e.user_id,
  //       e.attendance_day,
  //       e.status,
  //       e.check_in_time,
  //       e.check_out_time,
  //       e.notes,
  //       editor_user_id,
  //       now,
  //       now
  //     );
  //   }

  //   await ds.query(insertSql, insertParams);

  //   // ✅ SELECT back using raw query (avoid TypeORM find() placeholder bug)
  //   const whereOr = normalized
  //     .map(() => `(tenant_id = ? AND user_id = ? AND attendance_day = ?)`)
  //     .join(" OR ");

  //   const selectSql = `
  //     SELECT *
  //     FROM attendance_daily
  //     WHERE ${whereOr}
  //     ORDER BY attendance_day ASC, user_id ASC
  //   `;

  //   const selectParams = [];
  //   for (const e of normalized) {
  //     selectParams.push(tenant_id, e.user_id, e.attendance_day);
  //   }

  //   const rows = await ds.query(selectSql, selectParams);

  //   return {
  //     count: normalized.length,
  //     rows: normalized.length === 1 ? (rows[0] || null) : rows,
  //   };
  // }

  // Optional GET helper

  formatTimeWithSeconds(time) {
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}:00`; // Add ":00" for seconds
  }

  async upsertAttendance({ tenant_id, editor_user_id, entries, userRole }) {
    console.log("Inside upsertAttendance in service file");
    console.log("User role in upsertAttendance:", userRole);
    console.log("Entries in upsertAttendance:", entries);
    console.log("Tenant ID in upsertAttendance:", tenant_id);
    console.log("Editor User ID in upsertAttendance:", editor_user_id);

    const ds = await getDataSource();
    const now = new Date();

    // Normalize entries first
    const normalized = entries.map((e) => this.normalizeEntry(e));
    if (!normalized.length) throw new Error("No entries provided");

    const repo = ds.getRepository(AttendanceDaily);

    const fmtTime = (t) => (t ? this.formatTimeWithSeconds(t) : null);
    const formatAttendanceDay = (attendanceDay) => {
      console.log(
        "In the function formatAttendanceDay with input:",
        attendanceDay
      );
      const date = new Date(attendanceDay);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid attendanceDay format: " + attendanceDay);
      }

      const formattedDate = date.toISOString().slice(0, 19).replace("T", " "); // "2026-01-12 00:00:00"

      console.log("Formatted attendance day for MySQL:", formattedDate);

      return formattedDate;
    };

    for (const e of normalized) {
      const formattedCheckInTime = fmtTime(e.check_in_time);
      const formattedCheckOutTime = fmtTime(e.check_out_time);
      console.log("Formatted check-in time:++++++++", formattedCheckInTime);
      console.log("Formatted check-out time:++++++", formattedCheckOutTime);

      // Admin: can upsert all fields
      if (userRole === "Admin") {
        console.log("Admin upsert attendance_day:", e.attendance_day);

        await repo
          .createQueryBuilder()
          .insert()
          .into(AttendanceDaily)
          .values({
            tenant_id,
            user_id: e.user_id,
            attendance_day: e.attendance_day,
            status: e.status,
            check_in_time: formattedCheckInTime,
            check_out_time: formattedCheckOutTime,
            notes: e.notes,
            last_updated_by: editor_user_id,
            created_at: now,
            updated_at: now,
          })
          .orUpdate(
            [
              "status",
              "check_in_time",
              "check_out_time",
              "notes",
              "last_updated_by",
              "updated_at",
            ],
            ["tenant_id", "user_id", "attendance_day"]
          )
          .execute();
      } else {
        console.log(
          "Non-admin upsert attendance_day==========================:",
          formatAttendanceDay(e.attendance_day)
        );

        // Format the attendance_day properly
        const formattedAttendanceDay = formatAttendanceDay(e.attendance_day);
        console.log(
          "chk1---Formatted attendance day for non-admin upsert:",
          formattedAttendanceDay
        );

        // Extract only the time part (HH:MM:SS) from the full datetime string
        const extractTime = (dateTime) => {
          // Make sure to handle the date format, and extract the time part
          const timePart = dateTime.slice(11, 19); // Extracts "HH:MM:SS" from "YYYY-MM-DDTHH:MM:SS"
          return timePart;
        };

        // Now extract the times after the function is declared
        const formattedCheckInTime = extractTime(e.check_in_time);
        const formattedCheckOutTime = extractTime(e.check_out_time);

        console.log("Extracted check-in time:", formattedCheckInTime);
        console.log("Extracted check-out time:", formattedCheckOutTime);

        // Check if the record already exists
        const cleanDay = e.attendance_day.split("T")[0] + " 00:00:00";
        console.log("clling wiht id-----------:",tenant_id, e.user_id, cleanDay);
        const existingRecord = await repo
          .createQueryBuilder("attendance")
          .where("attendance.tenant_id = :tenant_id", { tenant_id })
          .andWhere("attendance.user_id = :user_id", { user_id: e.user_id })
          .andWhere("attendance.attendance_day = :attendance_day", {
            attendance_day: cleanDay,
          })
          .getOne();

        console.log(
          "chk2--- Existing record found for non-admin upsert:",
          existingRecord
        );

        // If the record exists, update the check_out_time
        if (existingRecord) {
          console.log(
            "Updating existing attendance record with new check_out_time"
          );

          // Log the fields that are being updated
          console.log("Fields being updated in the database:");
          console.log("Old check_out_time:", existingRecord.check_out_time);
          console.log("New check_out_time:", formattedCheckOutTime);

          await repo
            .createQueryBuilder()
            .update(AttendanceDaily)
            .set({
              check_out_time: formattedCheckOutTime, // Only update check_out_time
              last_updated_by: editor_user_id,
              updated_at: now,
            })
            .where("attendance_id = :id", { id: existingRecord.attendance_id })
            .execute();

          // Log successful update
          console.log(
            `Successfully updated attendance record with ID ${existingRecord.attendance_id}`
          );
        } else {
          console.log("Inserting new attendance record");

          // Log the fields that are being inserted
          console.log("Fields being inserted into the database:");
          console.log("attendance_day:", cleanDay);
          console.log("check_in_time:", formattedCheckInTime);
          console.log("check_out_time:", formattedCheckOutTime);

          // Insert a new record if not found
          await repo
            .createQueryBuilder()
            .insert()
            .into(AttendanceDaily)
            .values({
              tenant_id,
              user_id: e.user_id,
              attendance_day: () => `'${cleanDay}'`, // Properly formatted attendance_day
              status: e.status, // Used for insert only
              check_in_time: formattedCheckInTime, // Used for insert only
              check_out_time: formattedCheckOutTime, // Used for insert only
              notes: e.notes, // Used for insert only
              last_updated_by: editor_user_id,
              created_at: now,
              updated_at: now,
            })
            .execute();

          // Log successful insert
          console.log(
            `Successfully inserted new attendance record for user_id ${e.user_id}`
          );
        }
      }
    }

    // ✅ SELECT back (works for 1 or many): (user_id, attendance_day) IN ((...),(...))
    const tupleList = normalized.map((_, i) => `(:u${i}, :d${i})`).join(", ");

    const params = { tenant_id };
    normalized.forEach((e, i) => {
      params[`u${i}`] = e.user_id;
      params[`d${i}`] = e.attendance_day;
    });

    const rows = await repo
      .createQueryBuilder("attendance")
      .where("attendance.tenant_id = :tenant_id")
      .andWhere(
        `(attendance.user_id, attendance.attendance_day) IN (${tupleList})`
      )
      .setParameters(params)
      .orderBy("attendance.attendance_day", "ASC")
      .addOrderBy("attendance.user_id", "ASC")
      .getMany();

    return {
      count: normalized.length,
      rows: normalized.length === 1 ? rows[0] || null : rows,
    };
  }

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

  //   async checkAttendanceExists({ tenant_id, user_id, attendance_day }) {
  //   const ds = await getDataSource();
  //   const normalizedDay = this.toMidnight(attendance_day);  // Ensure it's in the right format

  //   const result = await ds.query(
  //     `SELECT 1
  //      FROM attendance_daily
  //      WHERE tenant_id = ? AND user_id = ? AND attendance_day = ?`,
  //     [tenant_id, user_id, normalizedDay]
  //   );

  //   return result.length > 0;  // Return true if a record exists, false otherwise
  // }
}
