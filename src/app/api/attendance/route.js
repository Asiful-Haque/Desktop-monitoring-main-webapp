// src/app/api/attendance/route.js
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { corsJson, corsEmpty } from "@/app/lib/coreResponse";
import { AttendanceService } from "@/app/services/attendance/attendanceService";

const attendanceService = new AttendanceService();

// GET /api/attendance?date=2025-12-01   OR  /api/attendance?from=2025-12-01&to=2025-12-31&user_id=3
export async function GET(req) {
  try {
    const token = await getAuthFromCookie(req);
    if (!token) return corsJson({ error: "Token missing or invalid" }, 401);

    const tenant_id = Number(token.tenant_id ?? token.tenantId);
    if (!tenant_id) return corsJson({ error: "tenant_id missing in token" }, 401);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const user_id = searchParams.get("user_id");

    const rows = await attendanceService.getAttendance({
      tenant_id,
      date,
      from,
      to,
      user_id,
    });

    return corsJson({ count: rows.length, rows }, 200);
  } catch (error) {
    console.error("❌ Attendance GET error:", error);
    return corsJson({ error: error?.message || "Failed to load attendance" }, 500);
  }
}

// POST supports: single object OR array OR { entries: [...] }
export async function POST(req) {
  try {
    const token = await getAuthFromCookie(req);
    if (!token) return corsJson({ error: "Token missing or invalid" }, 401);

    const tenant_id = Number(token.tenant_id ?? token.tenantId);
    const editor_user_id = Number(token.id ?? token.user_id);

    if (!tenant_id) return corsJson({ error: "tenant_id missing in token" }, 401);
    if (!editor_user_id) return corsJson({ error: "user_id missing in token" }, 401);

    const body = await req.json();

    let entries = [];
    if (Array.isArray(body)) entries = body;
    else if (Array.isArray(body?.entries)) entries = body.entries;
    else if (body && typeof body === "object") entries = [body];

    if (!entries.length) return corsJson({ error: "No attendance data provided" }, 400);

    const result = await attendanceService.upsertAttendance({
      tenant_id,
      editor_user_id,
      entries,
    });

    return corsJson(
      {
        message: entries.length === 1 ? "Attendance saved" : "Attendance saved (bulk)",
        ...result,
      },
      200
    );
  } catch (error) {
    console.error("❌ Attendance POST error:", error);
    return corsJson({ error: error?.message || "Failed to save attendance" }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
