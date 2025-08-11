import { verifyToken } from '@/app/lib/auth';
import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
import { TaskService } from '@/app/services/Task/taskService';
import { NextResponse } from "next/server";

const taskService = new TaskService();

export async function POST(req) {
  try {
    const body = await req.json();
    //console.log("data in backend1:", body);
    // Validate required fields
    if (!body.task_name || !body.project_name) {
            //console.log("data in backend22:", body);//-------------its should not enter here..data is not getting
      return NextResponse.json(
        { error: "task_name and project_id are required" },
        { status: 400 }
      );
    }
    //console.log("data in backend2:", body);
    const newTask = await taskService.setTask(body);

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

export async function OPTIONS() {
  return corsEmpty();
}
