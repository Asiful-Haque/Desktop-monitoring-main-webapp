// app/api/projects/route.ts
import ProjectService from '@/app/services/projects/projectService';
import { NextResponse } from 'next/server';

const projectService = new ProjectService();

export async function GET() {
  try {
    const projects = await projectService.getAllProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { title, description, status, created_by } = await req.json();
    if (!title || !description || !status || !created_by) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const newProject = await projectService.createProject({ title, description, status, created_by });
    return NextResponse.json({ message: 'Project created', project: newProject }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
