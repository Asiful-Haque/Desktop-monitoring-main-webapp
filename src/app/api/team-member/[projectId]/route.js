import { corsEmpty, corsJson } from '@/app/lib/coreResponse';
import { TeamMemberService } from '@/app/services/team-member/teamMemberService';
import { NextResponse } from "next/server";

const teamMemberService = new TeamMemberService();
export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.user_id || !body.project_id) {
      return NextResponse.json(
        { error: "User_id and project_id are required" },
        { status: 400 }
      );
    }
    const newMember = await teamMemberService.setMemberToProject({ 
      user_id: body.user_id,
      project_id: body.project_id,
    });
    return NextResponse.json(
      { message: "Member Added successfully", member: newMember },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating Member:", error);
  }
}

export async function GET(req, context) {
  try {
    const params = await context.params;  
    const { projectId } = params;

    if (!projectId) {
      return NextResponse.json({ error: "projectId param is required" }, { status: 400 });
    }
    const members = await teamMemberService.getMembersByProjectId(projectId);
    if (!members || members.length === 0) {
      return NextResponse.json({ message: "No members found for this project" }, { status: 404 });
    }
    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return corsEmpty();
  //Not using cors json because If your middleware sets CORS headers on all API routes, you can just use NextResponse.json() in API handlers.
}
