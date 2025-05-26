import clientPromise from "@/app/lib/mongodb";


export class TaskService {
  constructor() {
    this.collectionName = 'tasks'; // name of your MongoDB collection
  }

  async getCollection() {
    const client = await clientPromise;
    // console.log('MongoDB client connected',client);
    const db = client.db('task_monitor'); // uses the default database from the URI
    console.log('MongoDB database connected',db.databaseName);
    return db.collection(this.collectionName);
  }

  async getAllTasks() {
    console.log('Fetching all tasks...');
    const collection = await this.getCollection();
    const tasks = await collection.find({}).toArray();
    return tasks;
  }

  async createTask(data) {
    const collection = await this.getCollection();
    const result = await collection.insertOne({
      title: data.title,
      description: data.description || '',
      assigned_to: data.assigned_to,
      created_at: new Date(),
      status: 'pending',
    });
    return result;
  }
}
