// app/api/projects/[userId]/route.ts
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { ProjectService } from "@/app/services/projects/projectService";
import { NextResponse } from "next/server";

const projectService = new ProjectService();

export async function GET(req) {
  try {
    const token = await getAuthFromCookie(req);
    if (!token) {
      console.log("Unauthorized: No token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("Token in GET projects/route.js:", token);
    const allprojects = await projectService.getAllProjectsForAdmin(token.tenant_id);
    return NextResponse.json({ allprojects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await getAuthFromCookie(req);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { name, description, email, status, start_date, deadline } =
      await req.json();
    if (
      !name ||
      !description ||
      !status ||
      !start_date ||
      !deadline ||
      !email
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }
    const newProject = await projectService.createProject({
      name,
      description,
      start_date,
      deadline,
      status,
      email,
      tenant_id: auth.tenant_id,
    });

    return NextResponse.json(
      { message: "Project created", allprojects: newProject },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
