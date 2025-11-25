// app/services/TimeTracking/timeEditService.js
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { TimeTracking } from "@/app/lib/typeorm/entities/TimeTracking";
import { Task } from "@/app/lib/typeorm/entities/Task";

/** ------------------------------------------------------------------
 * Helpers for "create" (duration + session_payment computation)
 * ------------------------------------------------------------------ */
function normalizeDateInput(v) {
  if (!v) return null;
  // support "YYYY-MM-DD HH:mm:ss" by converting to ISO-ish
  if (typeof v === "string" && v.includes(" ") && !v.includes("T")) {
    return v.replace(" ", "T");
  }
  return v;
}

// seconds between start and end (>= 0, null when invalid/missing)
function toSecondsDiff(start, end) {
  if (!start || !end) return null;
  const s = new Date(normalizeDateInput(start)).getTime();
  const e = new Date(normalizeDateInput(end)).getTime();
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
  const pType = String(projectRow?.project_type || "").toLowerCase();
  if (pType === "hourly") {
    const rate = Number(projectRow?.project_hour_rate || 0);
    return roundMoney(hours * rate);
  }
  const rate = Number(userRateForProject || 0);
  return roundMoney(hours * rate);
}

export class TimeEditService {
  async recomputeSessionForEditMany(items) {
    const ds = await getDataSource();
    const ttRepo = ds.getRepository(TimeTracking);

    // Small caches
    const projectCache = new Map(); // project_id -> { project_type, project_hour_rate }
    const aupRateCache = new Map(); // `${project_id}:${user_id}` -> rate

    async function getProject(project_id) {
      if (projectCache.has(project_id)) return projectCache.get(project_id);
      const row = await ds
        .getRepository("Project")
        .createQueryBuilder("p")
        .select([
          "p.project_id AS project_id",
          "p.project_type AS project_type",
          "p.project_hour_rate AS project_hour_rate",
        ])
        .where("p.project_id = :pid", { pid: project_id })
        .getRawOne();
      if (!row) throw new Error(`Project not found: ${project_id}`);
      const proj = {
        project_type: row.project_type,
        project_hour_rate: row.project_hour_rate,
      };
      projectCache.set(project_id, proj);
      return proj;
    }

    async function getRate(project_id, user_id) {
      const key = `${project_id}:${user_id}`;
      if (aupRateCache.has(key)) return aupRateCache.get(key);
      const a = await ds
        .getRepository("AssignedUsersToProjects")
        .createQueryBuilder("a")
        .select([
          "a.project_id AS project_id",
          "a.user_id AS user_id",
          "a.user_rate_for_this_project AS rate",
        ])
        .where("a.project_id = :pid", { pid: project_id })
        .andWhere("a.user_id = :uid", { uid: user_id })
        .getRawOne();
      const rate = a?.rate ?? null;
      aupRateCache.set(key, rate);
      return rate;
    }

    const results = [];

    // Run in a transaction so multiple updates are atomic
    await ds.manager.transaction(async (trx) => {
      for (let i = 0; i < items.length; i++) {
        const it = items[i] || {};
        const serialId = Number(it.serial_id);

        // Load the current row
        const current = await trx
          .getRepository(TimeTracking)
          .createQueryBuilder("tt")
          .where("tt.serial_id = :sid", { sid: serialId })
          .select([
            "tt.serial_id AS serial_id",
            "tt.project_id AS project_id",
            "tt.developer_id AS developer_id",
            "tt.task_start AS task_start",
            "tt.task_end AS task_end",
            "tt.duration AS duration",
            "tt.session_payment AS session_payment",
          ])
          .getRawOne();

        if (!current) {
          const err = new Error(`time_tracking row not found (serial_id=${serialId})`);
          err.statusCode = 404;
          throw err;
        }

        // Decide start/end to compute with: prefer provided values, else keep DB
        const nextStart = it.task_start ?? current.task_start;
        const nextEnd   = it.task_end   ?? current.task_end;

        // If neither start/end exists, duration = 0 and payment = 0
        const newDuration = toSecondsDiff(nextStart, nextEnd) ?? 0;

        // Determine project & dev for payment computation
        const project_id = Number(it.project_id ?? current.project_id);
        const developer_id = it.developer_id != null
          ? Number(it.developer_id)
          : (current.developer_id != null ? Number(current.developer_id) : null);

        const project = await getProject(project_id);

        let userRate = null;
        if (developer_id != null && String(project.project_type || "").toLowerCase() !== "hourly") {
          userRate = await getRate(project_id, developer_id);
        }

        const newPayment = computeSessionPayment(newDuration, project, userRate);

        // Save updates (only overwrite times if caller provided them)
        const updateSet = {
          duration: newDuration,
          session_payment: newPayment,
        };
        if (it.task_start != null) updateSet.task_start = new Date(normalizeDateInput(it.task_start));
        if (it.task_end != null)   updateSet.task_end = it.task_end ? new Date(normalizeDateInput(it.task_end)) : null;

        await trx
          .getRepository(TimeTracking)
          .createQueryBuilder()
          .update(TimeTracking)
          .set(updateSet)
          .where("serial_id = :sid", { sid: serialId })
          .execute();

        results.push({
          serial_id: serialId,
          oldDuration: Number(current.duration || 0),
          newDuration,
          oldPayment: Number(current.session_payment || 0),
          newPayment,
        });
      }
    });

    return results;
  }

  
async applyEdits({ changes, context = {}, tenantId }) {
  console.log("Applying time edits:", { changesLength: changes.length });
  console.log("changes sample:", changes.slice(0, 2));

  if (!Array.isArray(changes) || changes.length === 0) {
    const err = new Error("No changes provided.");
    err.statusCode = 400;
    throw err;
  }

  const ds = await getDataSource();

  return ds.manager.transaction(async (trx) => {
    const ttRepo = trx.getRepository(TimeTracking);
    const taskRepo = trx.getRepository(Task);

    const taskDeltaMap = new Map(); // task_id -> deltaSeconds
    const updatedRows = [];

    for (const [idx, c] of changes.entries()) {
      if (
        !c?.serial_id ||
        !c?.task_id ||
        !c?.new?.startISO ||
        !c?.new?.endISO ||
        typeof c?.new?.seconds !== "number"
      ) {
        const err = new Error(
          `Invalid change at index ${idx}: serial_id, task_id, new.startISO, new.endISO, new.seconds required.`
        );
        err.statusCode = 400;
        throw err;
      }

      const serialId = Number(c.serial_id);
      const claimedTaskId = Number(c.task_id);
      const newStart = new Date(c.new.startISO);
      const newEnd = new Date(c.new.endISO);
      const newSeconds = Number(c.new.seconds);

      // Load current time_tracking row with Task join for tenant scope
      const current = await ttRepo
        .createQueryBuilder("tt")
        .innerJoin(Task, "t", "t.task_id = tt.task_id")
        .where("tt.serial_id = :serialId", { serialId })
        .andWhere(tenantId != null ? "t.tenant_id = :tenantId" : "1=1", {
          tenantId: tenantId != null ? Number(tenantId) : undefined,
        })
        .select([
          "tt.serial_id AS serial_id",
          "tt.task_id   AS tt_task_id",
          "tt.task_start AS task_start",
          "tt.task_end   AS task_end",
          "tt.duration   AS duration",
          "t.task_id     AS t_task_id",
          "t.last_timing AS last_timing",
        ])
        .getRawOne();

      if (!current) {
        const err = new Error(
          `time_tracking row not found or not accessible (serial_id=${serialId})`
        );
        err.statusCode = 404;
        throw err;
      }

      const dbTaskId = Number(current.tt_task_id ?? current.t_task_id);
      if (dbTaskId !== claimedTaskId) {
        const err = new Error(
          `serial_id ${serialId} belongs to task_id=${dbTaskId}, not ${claimedTaskId}`
        );
        err.statusCode = 400;
        throw err;
      }

      // Duration currently stored in DB (null treated as 0)
      const oldDurationFromDb = Number(current.duration || 0);

      // Client-sent diff (may be undefined / NaN)
      const clientDiffRaw = c.new && c.new.diff;
      const clientDiff =
        clientDiffRaw !== undefined && Number.isFinite(Number(clientDiffRaw))
          ? Number(clientDiffRaw)
          : null;

      // Final delta used to update tasks.last_timing
      // Prefer client diff if present, otherwise fall back to recompute.
      const delta =
        clientDiff !== null ? clientDiff : newSeconds - oldDurationFromDb;

      // Update the time_tracking row with the *new* values
      await ttRepo
        .createQueryBuilder()
        .update(TimeTracking)
        .set({
          task_start: newStart,
          task_end: newEnd,
          duration: newSeconds,
        })
        .where("serial_id = :serialId", { serialId })
        .execute();

      // Accumulate delta per task
      if (delta !== 0) {
        const prev = taskDeltaMap.get(dbTaskId) || 0;
        taskDeltaMap.set(dbTaskId, prev + delta);
      }

      updatedRows.push({
        serial_id: serialId,
        task_id: dbTaskId,
        oldSeconds: oldDurationFromDb,
        newSeconds,
        deltaSeconds: delta,
        clientDiff,
      });
    }

    // Apply accumulated deltas to tasks.last_timing
    const taskAdjustments = [];

    for (const [taskId, delta] of taskDeltaMap.entries()) {
      const task = await taskRepo.findOne({
        where: {
          task_id: Number(taskId),
          ...(tenantId != null ? { tenant_id: Number(tenantId) } : {}),
        },
      });

      if (!task) {
        const err = new Error(
          `Task not found or not accessible (task_id=${taskId})`
        );
        err.statusCode = 404;
        throw err;
      }

      // MySQL BIGINT can come as string
      const oldLast = Number(task.last_timing || 0);
      const nextLast = Math.max(0, oldLast + Number(delta || 0));

      await taskRepo
        .createQueryBuilder()
        .update(Task)
        .set({ last_timing: nextLast })
        .where("task_id = :taskId", { taskId })
        .execute();

      taskAdjustments.push({
        task_id: Number(taskId),
        deltaSeconds: delta,
        oldLastTiming: oldLast,
        newLastTiming: nextLast,
        direction: delta === 0 ? "none" : delta > 0 ? "increase" : "decrease",
      });
    }

    console.log("✅ Task adjustments from time edits:", taskAdjustments);
    console.log("✅ Updated rows from time edits:", updatedRows.slice(0, 5));

    return {
      ok: true,
      context: {
        dateKey: context?.dateKey ?? null,
        timezone: context?.timezone ?? null,
        reason: (context?.reason || "").trim(),
      },
      updatedRows,
      taskAdjustments,
    };
  });
}

}
