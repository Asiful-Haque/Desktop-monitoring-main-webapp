// app/api/projects/[userId]/route.ts

import { ProjectService } from '@/app/services/projects/projectService';
import { NextResponse } from 'next/server';

const projectService = new ProjectService();

export async function GET(req, context) {
  try {
    const params = await context.params;
    const userId = Number(params.userId);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const projects = await projectService.getAllProjects(userId);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { title, description, email, status, deadline } = await req.json();

    if (!title || !description || !status || !deadline || !email) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const newProject = await projectService.createProject({
      title,
      description,
      deadline,
      status,
      email,
    });

    return NextResponse.json({ message: 'Project created', project: newProject }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
