import { verifyToken } from '@/app/lib/auth';
import { getAuthFromCookie } from '@/app/lib/auth-server';
import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
import { TaskService } from '@/app/services/Task/taskService';
import { NextResponse } from "next/server";

const taskService = new TaskService();

export async function GET(req, context) {
      console.log('GET request received for tasks by project');
  try {

    const auth =  await getAuthFromCookie(req);           
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = await context.params;
    const projectId = Number(params.projectId);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const tasks = await taskService.getAllTasks({projectId,tenant_id: auth.tenant_id,});
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return corsEmpty();
  //Not using cors json because If your middleware sets CORS headers on all API routes, you can just use NextResponse.json() in API handlers.
}
