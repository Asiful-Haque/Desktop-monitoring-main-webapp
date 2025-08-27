import { verifyToken } from '@/app/lib/auth';
import { getAuthFromCookie } from '@/app/lib/auth-server';
import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
import { TaskService } from '@/app/services/Task/taskService';
import { NextResponse } from "next/server";

const taskService = new TaskService();

export async function GET(req, context) {
  try {
    const params = await context.params;
    const userId = Number(params.userId);
    console.log("Fetching tasks for userId:", userId);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    const token = await getAuthFromCookie(req);
    if (!token) {
      console.log("Unauthorized: No token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("Tenant ID from token:", token.tenant_id);
    const tasks = await taskService.getAllTasks({
      userId,
      tenant_id: token.tenant_id,
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
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
