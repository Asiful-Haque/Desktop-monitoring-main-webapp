import { verifyToken } from '@/app/lib/auth';
import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
import { TaskService } from '@/app/services/Task/taskService';
import { NextResponse } from "next/server";

const taskService = new TaskService();

export async function PUT(req, context) {
  try {
    const { params } = context;
    const taskId = Number(params.taskId);
    console.log('Fetching for taskId:', taskId); //getting taskid from param
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid taskId' }, { status: 400 });
    }

    const body = await req.json(); //getting the task from req
    const { newStatus } = body;
    if (!newStatus) {
      return NextResponse.json({ error: 'newStatus is required' }, { status: 400 });
    }

    const taskres = await taskService.updateTaskStatus({taskId, newStatus}); //calling fun with taskId and newStatus
    console.log("RESSS is ", taskres);
    return NextResponse.json({ taskres });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return corsEmpty();
  //Not using cors json because If your middleware sets CORS headers on all API routes, you can just use NextResponse.json() in API handlers.
}
