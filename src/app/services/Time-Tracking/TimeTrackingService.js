import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { TimeTracking } from "@/app/lib/typeorm/entities/TimeTracking";

export class TimeTrackingService {
  async repo() {
    const ds = await getDataSource();
    return ds.getRepository(TimeTracking);
  }

  // Create a single time tracking record
  async createOne(payload) {
    const repo = await this.repo();

    const row = repo.create({
      task_id: payload.task_id,
      project_id: payload.project_id,
      developer_id: payload.developer_id ?? null,
      work_date: payload.work_date,
      task_start: payload.task_start,
      task_end: payload.task_end ?? null,
    });

    return repo.save(row);
  }

  // Create multiple time tracking records
  async createMany(items) {
    const repo = await this.repo();
    const rows = items.map((i) =>
      repo.create({
        task_id: i.task_id,
        project_id: i.project_id,
        developer_id: i.developer_id ?? null,
        work_date: i.work_date,
        task_start: i.task_start,
        task_end: i.task_end ?? null,
      })
    );
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

  // async findByUserAndDay(userId, date) {
  //   const repo = await this.repo();

  //   // Construct the date range for the given day (from 00:00 to 23:59)
  //   const startOfDay = `${date} 00:00:00`;
  //   const endOfDay = `${date} 23:59:59`;

  //   // Query for time-tracking records within the specified date range and user ID (developer_id)
  //   const rows = await repo
  //     .createQueryBuilder("t")
  //     .where("t.work_date BETWEEN :start AND :end", {
  //       start: startOfDay,
  //       end: endOfDay,
  //     })
  //     .andWhere("t.developer_id = :userId", { userId })
  //     .orderBy("t.task_start", "ASC")
  //     .select([
  //       "t.serial_id AS serial_id",
  //       "t.task_id AS task_id",
  //       "t.project_id AS project_id",
  //       "t.developer_id AS developer_id",
  //       "t.work_date AS work_date",
  //       "t.task_start AS task_start",
  //       "t.task_end AS task_end",
  //       "t.created_at AS created_at",
  //       "t.updated_at AS updated_at",
  //     ])
  //     .getRawMany();

  //   return rows;
  // }
}
