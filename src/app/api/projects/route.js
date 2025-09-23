// app/api/projects/[userId]/route.ts
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { ProjectService } from "@/app/services/projects/projectService";
import { NextResponse } from "next/server";

const projectService = new ProjectService();

export async function GET(req) {
  try {
    const token = await getAuthFromCookie(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allprojects = await projectService.getAllProjectsForAdmin(token.tenant_id);
    return NextResponse.json({ allprojects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await getAuthFromCookie(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const {
      name,
      description,
      email,
      status,
      start_date,
      deadline,
      // NEW FIELDS
      client_name = null,
      project_type, // "fixed" | "hourly"
      total_budget,
      project_hour_rate,
    } = body || {};

    // Required fields
    if (!name || !description || !email || !status || !start_date || !deadline || !project_type) {
      return NextResponse.json({ error: "All required fields must be provided" }, { status: 400 });
    }

    // Validate project_type
    const validTypes = new Set(["fixed", "hourly", "developer_hour"]);
    if (!validTypes.has(project_type)) {
      return NextResponse.json({ error: "Invalid project_type. Use 'fixed' or 'hourly'." }, { status: 400 });
    }

    // Conditional validations + coercions
    const toNumberOrNull = (v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    let coercedTotalBudget = toNumberOrNull(total_budget);
    let coercedHourRate = toNumberOrNull(project_hour_rate);

    if (project_type === "fixed") {
      if (coercedTotalBudget === null || Number.isNaN(coercedTotalBudget)) {
        return NextResponse.json({ error: "total_budget is required and must be a valid number for 'fixed' projects." }, { status: 400 });
      }
      // ensure hourly is null
      coercedHourRate = null;
    } else if (project_type === "hourly") {
      if (coercedHourRate === null || Number.isNaN(coercedHourRate)) {
        return NextResponse.json({ error: "project_hour_rate is required and must be a valid number for 'hourly' projects." }, { status: 400 });
      }
      // ensure total is null
      coercedTotalBudget = null;
    }

    const newProject = await projectService.createProject({
      name,
      description,
      start_date,
      deadline,
      status,
      email,
      tenant_id: auth.tenant_id,
      // NEW FIELDS passed through
      client_name, // nullable
      project_type,
      total_budget: coercedTotalBudget, // number | null
      project_hour_rate: coercedHourRate, // number | null
    });

    return NextResponse.json(
      { message: "Project created", allprojects: newProject },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
