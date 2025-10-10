import { NextResponse } from "next/server";
import { TimeTrackingService } from "@/app/services/Time-Tracking/TimeTrackingService";

const service = new TimeTrackingService();
console.log("TimeTrackingService initialized in /api/time-sheet/by-date-range");

export async function POST(req) {
  try {
    const { startDate, endDate, userId, all = false } = await req.json();
    if (!all) {
      const { rows, total } = await service.findAllSubmittedForPayment({ userId });
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

    const items = await service.findByDateRangeAll({ startDate, endDate, userId });
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
