import { NextResponse } from "next/server";
import { TimeTrackingService } from "@/app/services/Time-Tracking/TimeTrackingService";
import { getAuthFromCookie } from "@/app/lib/auth-server";

const service = new TimeTrackingService();
console.log("TimeTrackingService initialized in /api/time-sheet/by-date-range");

export async function POST(req) {
  try {
    const { startDate, endDate, userId, userRole, all = false } = await req.json();
    if (!all) {
      const { rows, total } = await service.findAllToSubmitForPayment({ userId });
      console.log("Called with all=============false, returning");
      return NextResponse.json({
        ok: true,
        mode: "all-user",
        count: total ?? rows?.length ?? 0,
        items: rows ?? [],
      });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate required (or set all=false)" }, { status: 400 });
    }

    console.log("Called with all=============true, returning");
    const items = await service.findByDateRangeAll({ startDate, endDate, userId, userRole });
    console.log("Item count for date range:", items.length);
    console.log("Sample item for date range:", items[0]);
    return NextResponse.json({
      ok: true,
      mode: "range-all",
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("POST /api/time-sheet/by-date-range failed:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
