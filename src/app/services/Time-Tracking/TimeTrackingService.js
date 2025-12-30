import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { TimeTracking } from "@/app/lib/typeorm/entities/TimeTracking";
import { DateTime } from "luxon";

function parseUtcSql(s) {
  if (!s) return null;

  // If driver returned a JS Date, treat as UTC instant
  if (s instanceof Date) {
    const dt = DateTime.fromJSDate(s, { zone: "utc" }).toUTC();
    if (!dt.isValid) throw new Error(`Invalid datetime (Date): ${String(s)}`);
    return dt.toFormat("yyyy-LL-dd HH:mm:ss");
  }

  const str = String(s).trim();
  let dt;

  const looksIso =
    /^\d{4}-\d{2}-\d{2}T/.test(str) ||
    /Z$/i.test(str) ||
    /[+-]\d{2}:\d{2}$/.test(str);

  if (looksIso) {
    // keep provided timezone, then normalize to UTC
    dt = DateTime.fromISO(str, { setZone: true }).toUTC();
  } else {
    // IMPORTANT: treat SQL as UTC because your DB values are UTC
    dt = DateTime.fromSQL(str, { zone: "utc" });
  }

  // fallback (handles some non-standard strings)
  if (!dt.isValid) {
    const js = new Date(str);
    if (!Number.isNaN(js.getTime())) {
      dt = DateTime.fromJSDate(js, { zone: "utc" }).toUTC();
    }
  }

  if (!dt.isValid) throw new Error(`Invalid datetime: ${str}`);

  return dt.toFormat("yyyy-LL-dd HH:mm:ss");
}

/**
 * Convert DB UTC SQL ("YYYY-MM-DD HH:mm:ss") to UTC ISO ("YYYY-MM-DDTHH:mm:ss.000Z")
 * Also normalizes ISO strings to UTC ISO with Z.
 *
 * KEY FIX:
 * Your API currently returns SQL DATETIME (no timezone). Browsers parse that as LOCAL time
 * which shifts it. Sending an ISO with 'Z' removes ambiguity.
 */
function toUtcIsoZ(v) {
  if (!v) return null;

  // If driver returned Date, output ISO Z
  if (v instanceof Date) {
    return DateTime.fromJSDate(v, { zone: "utc" })
      .toUTC()
      .toISO({ suppressMilliseconds: false });
  }

  const s = String(v).trim();

  // MySQL DATETIME "YYYY-MM-DD HH:mm:ss" (your DB stores UTC)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(" ", "T") + ".000Z";
  }

  // ISO-like => normalize to Z
  const iso = DateTime.fromISO(s, { setZone: true }).toUTC();
  if (iso.isValid) return iso.toISO({ suppressMilliseconds: false });

  // fallback
  const js = new Date(s);
  if (!Number.isNaN(js.getTime())) {
    return DateTime.fromJSDate(js, { zone: "utc" })
      .toUTC()
      .toISO({ suppressMilliseconds: false });
  }

  throw new Error(`Invalid datetime: ${s}`);
}

function toSecondsDiffUtc(startAny, endAny) {
  if (!startAny || !endAny) return 0;

  const startSql = parseUtcSql(startAny);
  const endSql = parseUtcSql(endAny);

  const s = DateTime.fromSQL(startSql, { zone: "utc" });
  const e = DateTime.fromSQL(endSql, { zone: "utc" });

  if (!s.isValid) throw new Error(`Invalid datetime (start): ${startAny}`);
  if (!e.isValid) throw new Error(`Invalid datetime (end): ${endAny}`);

  return Math.max(0, Math.floor(e.diff(s, "seconds").seconds));
}

// helper: seconds between start and end (clamped to >= 0)
function toSecondsDiff(start, end) {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return null;
  return Math.max(0, Math.floor((e - s) / 1000));
}

function roundMoney(n) {
  if (n == null) return 0;
  return Number(Number(n).toFixed(2));
}

// compute payment for a single row given duration (sec), project record, and optional per-user rate
function computeSessionPayment(durationSec, projectRow, userRateForProject) {
  if (durationSec == null || durationSec <= 0) return 0;
  const hours = durationSec / 3600;

  if ((projectRow?.project_type || "").toLowerCase() === "hourly") {
    const rate = Number(projectRow?.project_hour_rate || 0);
    return roundMoney(hours * rate);
  }
  const rate = Number(userRateForProject || 0);
  return roundMoney(hours * rate);
}

function toUtcDateForDb(v) {
  if (!v) return null;
  if (v instanceof Date) return v;

  const s = String(v).trim();

  // ISO with Z or offset (your payload is like ...Z)
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const dt = DateTime.fromISO(s, { setZone: true }).toUTC();
    if (!dt.isValid) throw new Error(`Invalid ISO datetime: ${s}`);
    return dt.toJSDate(); // ✅ Date object (UTC instant)
  }

  // SQL "YYYY-MM-DD HH:mm:ss" treat as UTC
  const dt = DateTime.fromSQL(s, { zone: "utc" });
  if (!dt.isValid) throw new Error(`Invalid SQL datetime: ${s}`);
  return dt.toJSDate(); // ✅ Date object (UTC instant)
}

// ✅ NEW: prefer active_seconds (your tracker) if provided
function getActiveSecondsFromPayload(payload) {
  const n = Number(payload?.active_seconds);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

export class TimeTrackingService {
  async repo() {
    const ds = await getDataSource();
    return ds.getRepository(TimeTracking);
  }

async createOne(payload) {
  console.log("Creating time-tracking record with payload:", payload);

  const repo = await this.repo();
  const ds = await getDataSource();

  // 1) source of truth: Project
  const projectRepo = ds.getRepository("Project");
  const project = await projectRepo.findOne({
    where: { project_id: payload.project_id },
    select: ["project_id", "project_type", "project_hour_rate"],
  });
  if (!project) throw new Error(`Invalid project_id: ${payload.project_id}`);

  // -----------------------------
  // ✅ ACTIVE times (adjusted by idle)
  // -----------------------------
  const activeStartUtc = toUtcDateForDb(payload.task_start);
  const activeEndUtc = toUtcDateForDb(payload.task_end);

  // -----------------------------
  // ✅ RAW times (actual window)
  // -----------------------------
  const rawStartUtc = payload.raw_task_start
    ? toUtcDateForDb(payload.raw_task_start)
    : null;

  const rawEndUtc = payload.raw_task_end
    ? toUtcDateForDb(payload.raw_task_end)
    : null;

  // ✅ DB start/end must use RAW (fallback to ACTIVE if raw missing)
  const dbTaskStartUtc = rawStartUtc ?? activeStartUtc;
  const dbTaskEndUtc = rawEndUtc ?? activeEndUtc ?? null;

  console.log("INCOMING ACTIVE task_start:", payload.task_start);
  console.log("INCOMING ACTIVE task_end  :", payload.task_end);
  console.log("INCOMING RAW raw_task_start:", payload.raw_task_start);
  console.log("INCOMING RAW raw_task_end  :", payload.raw_task_end);

  console.log("NORMALIZED ACTIVE startUtc:", activeStartUtc);
  console.log("NORMALIZED ACTIVE endUtc  :", activeEndUtc);
  console.log("NORMALIZED RAW startUtc   :", rawStartUtc);
  console.log("NORMALIZED RAW endUtc     :", rawEndUtc);

  console.log("✅ DB will store task_start/task_end as RAW window:", {
    task_start: dbTaskStartUtc,
    task_end: dbTaskEndUtc,
  });

  // ✅ duration must remain ACTIVE worked time
  const activeSeconds = getActiveSecondsFromPayload(payload);
  const duration =
    activeSeconds != null
      ? activeSeconds
      : toSecondsDiffUtc(payload.task_start, payload.task_end); // fallback uses ACTIVE window

  console.log("✅ duration (worked seconds):", duration, {
    active_seconds: payload.active_seconds,
    used: activeSeconds != null ? "active_seconds" : "active_end-start_diff",
  });

  console.log("type of project is:", project.project_type);

  let userRateForProject = null;
  const developerId = payload.developer_id ?? null;

  if (
    (project.project_type || "").toLowerCase() !== "hourly" &&
    developerId != null
  ) {
    const aupRepo = ds.getRepository("AssignedUsersToProjects");
    const aupRow = await aupRepo.findOne({
      where: { project_id: payload.project_id, user_id: developerId },
      select: ["user_id", "project_id", "user_rate_for_this_project"],
    });
    userRateForProject = aupRow?.user_rate_for_this_project ?? null;
  }

  const session_payment = computeSessionPayment(
    duration, // ✅ payment based on ACTIVE worked seconds
    project,
    userRateForProject
  );

  console.log("Computed session_payment:", session_payment);

  const row = repo.create({
    task_id: payload.task_id,
    project_id: payload.project_id,
    developer_id: developerId,
    work_date: payload.work_date,

    // ✅ CHANGED: store RAW window in DB
    task_start: dbTaskStartUtc,
    task_end: dbTaskEndUtc,

    // ✅ keep worked time correct
    duration,
    session_payment,
    tenant_id: payload.tenant_id ?? 0,
  });

  return repo.save(row);
}


async createMany(items) {
  const repo = await this.repo();
  const ds = await getDataSource();

  // 1) Prefetch projects (now selecting project_type)
  const projectIds = [...new Set(items.map((i) => i.project_id))];

  const projectRows = await ds
    .getRepository("Project")
    .createQueryBuilder("p")
    .select([
      "p.project_id AS project_id",
      "p.project_type AS project_type",
      "p.project_hour_rate AS project_hour_rate",
    ])
    .where("p.project_id IN (:...ids)", { ids: projectIds })
    .getRawMany();

  const projectById = new Map(
    projectRows.map((r) => [
      r.project_id,
      {
        project_type: r.project_type,
        project_hour_rate: r.project_hour_rate,
      },
    ])
  );

  // 2) Prefetch AssignedUsersToProjects only for non-hourly projects with a developer
  const pairs = [];
  for (const i of items) {
    const devId = i.developer_id ?? null;
    const proj = projectById.get(i.project_id);
    if (!proj) throw new Error(`Invalid project_id: ${i.project_id}`);
    if (devId != null && (proj.project_type || "").toLowerCase() !== "hourly") {
      pairs.push({ project_id: i.project_id, user_id: devId });
    }
  }

  let rateByProjectUser = new Map();
  if (pairs.length) {
    const projIdsForAup = [...new Set(pairs.map((p) => p.project_id))];
    const userIdsForAup = [...new Set(pairs.map((p) => p.user_id))];

    const aupRows = await ds
      .getRepository("AssignedUsersToProjects")
      .createQueryBuilder("a")
      .select([
        "a.project_id AS project_id",
        "a.user_id AS user_id",
        "a.user_rate_for_this_project AS user_rate_for_this_project",
      ])
      .where("a.project_id IN (:...pids)", { pids: projIdsForAup })
      .andWhere("a.user_id IN (:...uids)", { uids: userIdsForAup })
      .getRawMany();

    rateByProjectUser = new Map(
      aupRows.map((r) => [
        `${r.project_id}:${r.user_id}`,
        r.user_rate_for_this_project,
      ])
    );
  }

  // ✅ duration should be ACTIVE seconds (idle already deducted on client)
  const pickActiveDurationSeconds = (i) => {
    if (Number.isFinite(Number(i.active_seconds))) return Number(i.active_seconds);
    // backward compatible fallback
    return toSecondsDiffUtc(i.task_start, i.task_end);
  };

  // 3) Build rows
  const rows = items.map((i) => {
    const devId = i.developer_id ?? null;
    const proj = projectById.get(i.project_id);
    if (!proj) throw new Error(`Invalid project_id: ${i.project_id}`);

    // Incoming ACTIVE (may be shifted) — still useful as fallback
    const activeStartUtc = toUtcDateForDb(i.task_start);
    const activeEndUtc = toUtcDateForDb(i.task_end);

    // ✅ Incoming RAW (actual window) — NOW becomes DB task_start/task_end
    const rawStartUtc = i.raw_task_start ? toUtcDateForDb(i.raw_task_start) : null;
    const rawEndUtc = i.raw_task_end ? toUtcDateForDb(i.raw_task_end) : null;

    // ✅ DB start/end should be RAW, fallback to ACTIVE if RAW missing
    const dbStartUtc = rawStartUtc ?? activeStartUtc;
    const dbEndUtc = rawEndUtc ?? activeEndUtc ?? null;

    // ✅ duration should stay ACTIVE time
    const duration = pickActiveDurationSeconds(i);

    console.log("✅ TIME-TRACKING SEGMENT (DB uses RAW window, duration uses ACTIVE)", {
      task_id: i.task_id,
      project_id: i.project_id,
      developer_id: devId,
      segment_index: i.segment_index,
      work_date: i.work_date,

      raw: {
        raw_task_start: i.raw_task_start,
        raw_task_end: i.raw_task_end,
        db_task_start_utc: dbStartUtc,
        db_task_end_utc: dbEndUtc,
        raw_seconds: i.raw_seconds,
      },

      active: {
        task_start: i.task_start,
        task_end: i.task_end,
        active_seconds: i.active_seconds,
        idle_deducted_seconds: i.idle_deducted_seconds,
      },

      duration_used_seconds: duration,
      duration_source: Number.isFinite(Number(i.active_seconds))
        ? "active_seconds"
        : "end-start-diff-fallback",
    });

    let userRate = null;
    if ((proj.project_type || "").toLowerCase() !== "hourly" && devId != null) {
      userRate = rateByProjectUser.get(`${i.project_id}:${devId}`) ?? null;
    }

    const session_payment = computeSessionPayment(duration, proj, userRate);

    return repo.create({
      task_id: i.task_id,
      project_id: i.project_id,
      developer_id: devId,
      work_date: i.work_date,

      // ✅ CHANGED: store RAW time in DB
      task_start: dbStartUtc,
      task_end: dbEndUtc,

      // ✅ keep worked time correct
      duration,

      session_payment,
      tenant_id: i.tenant_id ?? 0,
    });
  });

  return repo.save(rows);
}


  async findByProjectAndDay(projectId, date) {
    const repo = await this.repo();
    console.log("Finding records for projectId:", projectId, "on date:", date);
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;

    const rows = await repo
      .createQueryBuilder("t")
      .where("t.work_date BETWEEN :start AND :end", {
        start: startOfDay,
        end: endOfDay,
      })
      .andWhere("t.project_id = :projectId", { projectId })
      .orderBy("t.developer_id", "ASC")
      .addOrderBy("t.work_date", "ASC")
      .addOrderBy("t.task_start", "ASC")
      .select([
        "t.serial_id AS serial_id",
        "t.task_id AS task_id",
        "t.project_id AS project_id",
        "t.developer_id AS developer_id",
        "t.work_date AS work_date",
        "t.task_start AS task_start",
        "t.task_end AS task_end",
        "t.created_at AS created_at",
        "t.updated_at AS updated_at",
      ])
      .getRawMany();

    // ✅ FIX: convert DB UTC SQL to ISO Z before returning to frontend
    return rows.map((r) => ({
      ...r,
      task_start: toUtcIsoZ(r.task_start),
      task_end: toUtcIsoZ(r.task_end),
    }));
  }

  async findByUserAndDay(devId, date) {
    const repo = await this.repo();
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;
    const userId = devId;

    const rows = await repo
      .createQueryBuilder("t")
      .where("t.work_date BETWEEN :start AND :end", {
        start: startOfDay,
        end: endOfDay,
      })
      .andWhere("t.developer_id = :userId", { userId })
      .orderBy("t.task_start", "ASC")
      .select([
        "t.serial_id AS serial_id",
        "t.task_id AS task_id",
        "t.project_id AS project_id",
        "t.developer_id AS developer_id",
        "t.work_date AS work_date",
        "t.task_start AS task_start",
        "t.task_end AS task_end",
        "t.created_at AS created_at",
        "t.updated_at AS updated_at",
      ])
      .getRawMany();

    // ✅ FIX: convert DB UTC SQL to ISO Z before returning to frontend
    return rows.map((r) => ({
      ...r,
      task_start: toUtcIsoZ(r.task_start),
      task_end: toUtcIsoZ(r.task_end),
    }));
  }

  async findAllToSubmitForPayment({ userId }) {
    const repo = await this.repo();

    const baseWhere = { uid: userId, flag: 0 };

    const qb = repo
      .createQueryBuilder("t")
      .leftJoin("projects", "p", "p.project_id = t.project_id")
      .leftJoin("tasks", "task", "task.task_id = t.task_id")
      .where("t.developer_id = :uid", baseWhere)
      .andWhere("t.flagger = :flag", baseWhere)
      .orderBy("t.work_date", "ASC")
      .addOrderBy("t.task_start", "ASC")
      .select([
        "t.serial_id AS serial_id",
        "t.task_id AS task_id",
        "t.project_id AS project_id",
        "t.developer_id AS developer_id",
        "t.work_date AS work_date",
        "t.task_start AS task_start",
        "t.task_end AS task_end",
        "t.duration AS duration",
        "t.session_payment AS session_payment",
        "t.flagger AS flagger",
        "p.project_name AS project_name",
        "task.task_name AS task_name",
      ]);

    const [rows, total] = await Promise.all([
      qb.getRawMany(),
      repo
        .createQueryBuilder("t")
        .where("t.developer_id = :uid", baseWhere)
        .andWhere("t.flagger = :flag", baseWhere)
        .getCount(),
    ]);

    // ✅ FIX: convert DB UTC SQL to ISO Z before returning
    return {
      rows: rows.map((r) => ({
        ...r,
        task_start: toUtcIsoZ(r.task_start),
        task_end: toUtcIsoZ(r.task_end),
      })),
      total,
    };
  }

  async findByDateRangeAll({
    startDate,
    endDate,
    userId,
    userRole,
    tenant_id,
  }) {
    console.log("Got the function for database call you called with dates ", startDate, endDate);
    console.log("Tenant ID:", tenant_id, "User ID:", userId, "User Role:", userRole);
    const repo = await this.repo();
    const role = String(userRole || "")
      .trim()
      .toLowerCase();
    const isDeveloper = role === "developer" || role === "freelancer";

    const qb = repo
      .createQueryBuilder("t")
      .leftJoin("projects", "p", "p.project_id = t.project_id")
      .leftJoin("tasks", "task", "task.task_id = t.task_id")
      .leftJoin("users", "u", "u.user_id = t.developer_id")
      .leftJoin("user_roles", "ur", "ur.user_id = u.user_id")
      .leftJoin("roles", "r", "r.role_id = ur.role_id")
      .where("t.work_date BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .andWhere("t.tenant_id = :tenantId", { tenantId: tenant_id })
      .orderBy("t.work_date", "ASC")
      .addOrderBy("t.task_start", "ASC")
      .select([
        "t.serial_id AS serial_id",
        "t.task_id AS task_id",
        "t.project_id AS project_id",
        "t.developer_id AS developer_id",
        "t.work_date AS work_date",
        "t.task_start AS task_start",
        "t.task_end AS task_end",
        "t.duration AS duration",
        "t.session_payment AS session_payment",
        "t.flagger AS flagger",
        "t.tenant_id AS tenant_id",
        "p.project_name AS project_name",
        "task.task_name AS task_name",
        "u.user_id AS dev_user_id",
        "u.username AS developer_name",
        "u.email AS developer_email",
        "r.role_name AS role",
      ]);

    if (isDeveloper) {
      qb.andWhere("t.developer_id = :uid", { uid: userId });
    }

    const rows = await qb.getRawMany();
    console.log("Fetched items count for date range:", rows.length);

    // ✅ FIX: convert DB UTC SQL to ISO Z before returning
    return rows.map((r) => ({
      ...r,
      task_start: toUtcIsoZ(r.task_start),
      task_end: toUtcIsoZ(r.task_end),
    }));
  }

  async updateFlaggerForSerialIds(data, flagger, userId) {
    console.log("In /api/update-flagger, received data:", data);

    try {
      const repo = await this.repo();

      let serialIdsRaw = [];

      if (Array.isArray(data) && data.every((d) => typeof d === "number")) {
        serialIdsRaw = data;
        console.log("Serial IDs received directly:", serialIdsRaw);
      } else if (Array.isArray(data)) {
        serialIdsRaw = data.flatMap((d) => d?.serial_ids ?? []);
        console.log("Flattened serialIds from array of objects:", serialIdsRaw);
      } else if (data?.serial_ids) {
        serialIdsRaw = data.serial_ids || [];
        console.log("Serial IDs extracted from single object:", serialIdsRaw);
      } else {
        console.error(
          "Invalid data format. Expected an array of serial IDs or array of objects with `serial_ids`."
        );
        return { affected: 0, raw: [], info: "Invalid data format" };
      }

      const serialIds = [
        ...new Set(
          serialIdsRaw.map((n) => Number(n)).filter((n) => !Number.isNaN(n))
        ),
      ];

      console.log("Parsed serialIds:", serialIds);
      if (serialIds.length === 0) {
        console.warn("No valid serial_ids provided.");
        return { affected: 0, raw: [], info: "No serial_ids provided" };
      }

      const result = await repo
        .createQueryBuilder()
        .update(TimeTracking)
        .set({ flagger })
        .where("serial_id IN (:...serialIds)", { serialIds })
        .andWhere("developer_id = :userId", { userId })
        .execute();

      console.log("Update result:", result);

      return result;
    } catch (err) {
      console.error("Error updating flagger by serial_ids:", err);
      throw new Error("Failed to update flagger for the provided serial_ids.");
    }
  }
}
