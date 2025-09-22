// app/api/projects/[userId]/route.ts

import { ProjectService } from '@/app/services/projects/projectService';
import { NextResponse } from 'next/server';

const projectService = new ProjectService();

export async function GET(req, context) {
  try {
    const params = await context.params;
    const projectId = Number(params.projectId);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
    }

    const projectDetailsResponse = await projectService.getProjectDetails(projectId);
    return NextResponse.json({ projectDetailsResponse });
  } catch (error) {
    console.error('Error fetching project details:', error);
    return NextResponse.json({ error: 'Failed to fetch project details' }, { status: 500 });
  }
}


export async function PUT(req, { params }) {
  console.log("Came here --------- in route.js");
  const projectId = Number(params.projectId);
  if (!projectId) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const body = await req.json();
  const updated = await projectService.updateProject(projectId, body);

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}