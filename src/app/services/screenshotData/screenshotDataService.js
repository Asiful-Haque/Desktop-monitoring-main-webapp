// app/api/screenshot-data/ScreenshotDataService.js
import clientPromise from "@/app/lib/mongodb";

export class ScreenshotDataService {
  constructor() {
    this.collectionName = "ssData"; // MongoDB collection name
  }

  async getCollection() {
    const client = await clientPromise;
    const db = client.db("task_monitor"); 
    return db.collection(this.collectionName);
  }

  async createScreenshotData(data) {
    const collection = await this.getCollection();
    const result = await collection.insertOne({
      screenshotPath: data.screenshotPath,
      task: data.task,
      timestamp: data.timestamp,
      idleSeconds: data.idleSeconds,
      activeSeconds: data.activeSeconds,
      createdAt: new Date(),
    });
    return result;
  }
}
