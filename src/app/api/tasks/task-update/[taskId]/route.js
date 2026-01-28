import { verifyToken } from '@/app/lib/auth';
import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
import { TaskService } from '@/app/services/Task/taskService';
import { NextResponse } from "next/server";

const taskService = new TaskService();

export async function PUT(req, context) {
  try {
    const { taskId: taskIdParam } = await context.params;
    const taskId = Number(taskIdParam);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid taskId' }, { status: 400 });
    }

    const body = await req.json(); // getting the task from req

    console.log('Updating taskId:<<<<<<<<<<<<<<', taskId, 'with body:', body);
    const { newStatus, last_timing } = body; 
    console.log('Received------ newStatus:', newStatus, 'and last---------_timing:', last_timing); 

    // Validate that either newStatus or last_timing is present in the body
    // if (!newStatus && !last_timing) {
    //   return NextResponse.json({ error: 'newStatus or last_timing is required' }, { status: 400 });
    // }

    let taskres;

    // If last_timing is present, we include it along with taskId and newStatus
    if (last_timing) {
      taskres = await taskService.updateTaskTiming({ taskId, last_timing });
      console.log("Task with last_timing updated:", taskres);
    } else if (newStatus) {
      // If only newStatus is present, we just send taskId and newStatus
      taskres = await taskService.updateTaskStatus({ taskId, newStatus });
      console.log("Task with newStatus updated:", taskres);
    }

    return NextResponse.json({ taskres });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return corsEmpty();
  //Not using cors json because If your middleware sets CORS headers on all API routes, you can just use NextResponse.json() in API handlers.
}
