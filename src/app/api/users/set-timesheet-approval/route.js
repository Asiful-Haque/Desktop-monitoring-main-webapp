import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { UsersService } from "@/app/services/users/usersService";

const usersService = new UsersService();

export async function POST(req) {
  try {
    const auth = await getAuthFromCookie(req);
    if (!auth) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { user_id, time_sheet_approval } = body || {};

    if (!user_id && user_id !== 0) {
      return NextResponse.json({ message: "user_id is required" }, { status: 400 });
    }
    if (time_sheet_approval === undefined || time_sheet_approval === null || time_sheet_approval === "") {
      return NextResponse.json({ message: "time_sheet_approval is required" }, { status: 400 });
    }

    const uid = Number(user_id);
    const ts = Number(time_sheet_approval);

    if (!Number.isInteger(uid) || uid <= 0) {
      return NextResponse.json({ message: "user_id must be a positive integer" }, { status: 400 });
    }
    if (!Number.isFinite(ts)) {
      return NextResponse.json({ message: "time_sheet_approval must be a number" }, { status: 400 });
    }

    // Optional: restrict who can update whom
    // if (!auth.is_admin && auth.user_id !== uid) { return NextResponse.json({ message: "Forbidden" }, { status: 403 }); }

    const updated = await usersService.setTimesheetApproval(uid, ts);
    return NextResponse.json({
      message: "Updated",
      user_id: updated.user_id,
      username: updated.username,
      time_sheet_approval: updated.time_sheet_approval,
      updated_at: updated.updated_at,
    });
  } catch (error) {
    if (error?.code === "NOT_FOUND") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    console.error("Error in set-timesheet-approval:", error);
    return NextResponse.json({ message: "Failed to update timesheet approval" }, { status: 500 });
  }
}
