import { corsEmpty } from '@/app/lib/coreResponse';
import { TeamMemberService } from '@/app/services/team-member/teamMemberService';
import { NextResponse } from 'next/server';

const teamMemberService = new TeamMemberService();

export async function POST(req, { params }) {
  try {
    const body = await req.json().catch(() => ({}));

    const awaitedParams = await params;
    const projectIdFromPath = awaitedParams?.projectId
      ? Number(awaitedParams.projectId)
      : undefined;

    const user_id = Number(body.user_id);
    const project_id = Number(body.project_id ?? projectIdFromPath);

    const rawRate = body.user_rate_for_this_project;
    let user_rate_for_this_project = null;
    if (rawRate !== undefined && rawRate !== null && rawRate !== '') {
      const n = Number(rawRate);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { error: 'user_rate_for_this_project must be a non-negative number' },
          { status: 400 }
        );
      }
      user_rate_for_this_project = n;
    }

    if (!user_id || !project_id) {
      return NextResponse.json(
        { error: 'user_id and project_id are required' },
        { status: 400 }
      );
    }

    const newMember = await teamMemberService.setMemberToProject({
      user_id,
      project_id,
      user_rate_for_this_project, 
    });

    return NextResponse.json(
      { message: 'Member added successfully', member: newMember },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating Member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    // ✅ Await params first
    const awaitedParams = await params;
    const projectId = awaitedParams?.projectId
      ? Number(awaitedParams.projectId)
      : undefined;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId param is required' },
        { status: 400 }
      );
    }

    const members = await teamMemberService.getMembersByProjectId(projectId);
    return NextResponse.json({ members: members ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
