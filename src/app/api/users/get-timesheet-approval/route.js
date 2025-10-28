import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { UsersService } from "@/app/services/users/usersService";

const usersService = new UsersService();

export async function GET(req) {
  try {
    const auth = await getAuthFromCookie(req);
    if (!auth) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const user_id_raw = searchParams.get("user_id");

    if (!user_id_raw) {
      return NextResponse.json({ message: "user_id is required" }, { status: 400 });
    }

    const user_id = Number(user_id_raw);
    if (!Number.isInteger(user_id) || user_id <= 0) {
      return NextResponse.json({ message: "user_id must be a positive integer" }, { status: 400 });
    }

    console.log("Fetching timesheet approval for user_id55555555555555555:", user_id);
    const data = await usersService.getTimesheetApproval(user_id);
    return NextResponse.json({
      user_id: data.user_id,
      username: data.username,
      time_sheet_approval: data.time_sheet_approval,
      updated_at: data.updated_at,
    });
  } catch (error) {
    if (error?.code === "NOT_FOUND") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    console.error("Error in get-timesheet-approval:", error);
    return NextResponse.json({ message: "Failed to fetch timesheet approval" }, { status: 500 });
  }
}
