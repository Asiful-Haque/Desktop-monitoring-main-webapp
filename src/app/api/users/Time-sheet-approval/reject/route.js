// app/api/users/Time-sheet-approval/reject/route.js
import { UsersService } from "@/app/services/users/usersService";
import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/app/lib/auth-server";

const usersService = new UsersService();

export async function POST(req) {
  try {
    const auth = await getAuthFromCookie(req);
    if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { user_id } = await req.json();
    const uid = Number(user_id);
    if (!Number.isFinite(uid) || uid <= 0) {
      return NextResponse.json({ message: "Valid user_id is required" }, { status: 400 });
    }

    const value = await usersService.setTimeSheetApproval(uid, 2);
    return NextResponse.json({ time_sheet_approval: value, message: "Rejected (2)" });
  } catch (e) {
    return NextResponse.json({ message: e?.message || "Failed to reject" }, { status: 500 });
  }
}
