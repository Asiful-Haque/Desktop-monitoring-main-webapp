// src/app/services/tracking/websiteService.js
import { getDataSource } from "@/app/lib/typeorm/db/getDataSource";
import { WebsiteTracking } from "@/app/lib/typeorm/entities/WebsiteTracking";

export class WebsiteService {
  async upsertWebsiteTime({ user_id, entries }) {
    const ds = await getDataSource();
    const repo = ds.getRepository(WebsiteTracking);
    const today = new Date().toISOString().split('T')[0];

    for (const [url, seconds] of Object.entries(entries)) {
      // Try to find existing record for today
      let record = await repo.findOne({
        where: { user_id, website_url: url, tracking_date: today }
      });

      if (record) {
        // ADDITION: matches same date, time is added (e.g., 200 + 50)
        record.duration_seconds = Number(record.duration_seconds) + Number(seconds);
        await repo.save(record);
      } else {
        // NEW RECORD: first time today
        const newEntry = repo.create({
          user_id,
          website_url: url,
          duration_seconds: seconds,
          tracking_date: today
        });
        await repo.save(newEntry);
      }
    }
    return { success: true };
  }

  async getTrackingData({ user_id, date }) {
    const ds = await getDataSource();
    return await ds.getRepository(WebsiteTracking).find({
      where: { user_id: Number(user_id), tracking_date: date },
      order: { duration_seconds: "DESC" }
    });
  }
}