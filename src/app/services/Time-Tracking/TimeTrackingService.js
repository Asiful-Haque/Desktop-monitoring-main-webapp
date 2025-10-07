import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { TimeTracking } from "@/app/lib/typeorm/entities/TimeTracking";

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

  // otherwise use the user's assigned rate for this project (if any)
  const rate = Number(userRateForProject || 0);
  return roundMoney(hours * rate);
}

export class TimeTrackingService {
  async repo() {
    const ds = await getDataSource();
    return ds.getRepository(TimeTracking);
  }

  async createOne(payload) {
    const repo = await this.repo();
    const ds = await getDataSource();

    // 1) source of truth: Project
    const projectRepo = ds.getRepository("Project");
    const project = await projectRepo.findOne({
      where: { project_id: payload.project_id },
      select: ["project_id", "project_type", "project_hour_rate"],
    });
    if (!project) throw new Error(`Invalid project_id: ${payload.project_id}`);

    const duration = toSecondsDiff(payload.task_start, payload.task_end);
    console.log("Computed duration (sec):", duration);
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
      duration,
      project,
      userRateForProject
    );
    console.log("Computed session_payment:", session_payment);

    const row = repo.create({
      task_id: payload.task_id,
      project_id: payload.project_id,
      developer_id: developerId,
      work_date: payload.work_date,
      task_start: payload.task_start,
      task_end: payload.task_end ?? null,
      duration,
      session_payment,
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
      if (
        devId != null &&
        (proj.project_type || "").toLowerCase() !== "hourly"
      ) {
        pairs.push({ project_id: i.project_id, user_id: devId });
      }
    }

    let rateByProjectUser = new Map(); // key: `${project_id}:${user_id}` -> rate
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

    // 3) Build rows
    const rows = items.map((i) => {
      const devId = i.developer_id ?? null;
      const proj = projectById.get(i.project_id);
      if (!proj) throw new Error(`Invalid project_id: ${i.project_id}`);

      const duration = toSecondsDiff(i.task_start, i.task_end);

      let userRate = null;
      if (
        (proj.project_type || "").toLowerCase() !== "hourly" &&
        devId != null
      ) {
        userRate = rateByProjectUser.get(`${i.project_id}:${devId}`) ?? null;
      }

      const session_payment = computeSessionPayment(duration, proj, userRate);

      return repo.create({
        task_id: i.task_id,
        project_id: i.project_id,
        developer_id: devId,
        work_date: i.work_date,
        task_start: i.task_start,
        task_end: i.task_end ?? null,
        duration,
        session_payment,
      });
    });

    return repo.save(rows);
  }

  async findByProjectAndDay(projectId, date) {
    const repo = await this.repo();
    console.log("Finding records for projectId:", projectId, "on date:", date);
    // Construct the date range for the given day (from 00:00 to 23:59)
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;
    console.log("Date range:", startOfDay, "to", endOfDay);

    // Query for time-tracking records within the specified date range and project ID
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

    return rows;
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

    return rows;
  }

  async findByDateRangeAll({ startDate, endDate, userId }) {
    const repo = await this.repo();
    return repo
      .createQueryBuilder("t")
      .where("t.work_date BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .andWhere("t.developer_id = :uid", { uid: userId })
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
      ])
      .getRawMany();
  }

  async findAllSubmittedForPayment({ userId }) {
    const repo = await this.repo();

    const baseWhere = { uid: userId, flag: 0 };

    const qb = repo
      .createQueryBuilder("t")
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
      ])

    const [rows, total] = await Promise.all([
      qb.getRawMany(),
      repo
        .createQueryBuilder("t")
        .where("t.developer_id = :uid", baseWhere)
        .andWhere("t.flagger = :flag", baseWhere)
        .getCount(),
    ]);

    return { rows, total };
  }
}
