import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
import { TaskService } from '@/app/services/Task/taskService';

const taskService = new TaskService();

export async function GET() {
  try {
    const tasks = await taskService.getAllTasks();
    return corsJson(tasks);
  } catch (error) {
    return corsJson({ error: 'Failed to fetch tasks' }, 500);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    if (!data.title || !data.assigned_to) {
      return corsJson({ error: 'Title and assigned_to are required' }, 400);
    }

    const result = await taskService.createTask(data);
    return corsJson({ message: 'Task created', taskId: result.insertedId }, 201);
  } catch (error) {
    return corsJson({ error: 'Failed to create task' }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
