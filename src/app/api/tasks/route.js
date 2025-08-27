import { verifyToken } from '@/app/lib/auth';
import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
import { TaskService } from '@/app/services/Task/taskService';
import { NextResponse } from "next/server";
import { getAuthFromCookie } from '@/app/lib/auth-server';

const taskService = new TaskService();

export async function POST(req) {
  try {
    const auth =  await getAuthFromCookie(req);           
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    if (!body.task_name || !body.project_name) {
      return NextResponse.json(
        { error: "task_name and project_id are required" },
        { status: 400 }
      );
    }
    const newTask = await taskService.setTask({taskData: body, tenant_id: auth.tenant_id});
    return NextResponse.json(
      { message: "Task created successfully", task: newTask },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const tasks = await taskService.allTaskForGraph();
    return NextResponse.json(
      { message: "Tasks fetched successfully", tasks },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching tasks for graph:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return corsEmpty();
  //Not using cors json because If your middleware sets CORS headers on all API routes, you can just use NextResponse.json() in API handlers.
}
