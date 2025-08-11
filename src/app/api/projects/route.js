// app/api/projects/[userId]/route.ts

import { ProjectService } from '@/app/services/projects/projectService';
import { NextResponse } from 'next/server';

const projectService = new ProjectService();
export async function POST(req) {
  try {
    const { name, description, email, status, start_date, deadline } = await req.json();
    if (!name || !description || !status || !start_date || !deadline || !email) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    const newProject = await projectService.createProject({
      name,
      description,
      start_date,
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
