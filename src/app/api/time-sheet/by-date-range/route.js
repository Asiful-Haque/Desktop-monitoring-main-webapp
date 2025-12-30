import { NextResponse } from "next/server";
import { TimeTrackingService } from "@/app/services/Time-Tracking/TimeTrackingService";
import { getAuthFromCookie } from "@/app/lib/auth-server";

const service = new TimeTrackingService();
console.log("TimeTrackingService initialized in /api/time-sheet/by-date-range");

export async function POST(req) {
  try {
    const { startDate, endDate, userId, userRole, all = false, tenant_id } = await req.json();
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

    console.log("Dates are ===", startDate, endDate);
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate required (or set all=false)" }, { status: 400 });
    }

    console.log("Called with all=============true, returning");
    const items = await service.findByDateRangeAll({ startDate, endDate, userId, userRole, tenant_id });
    console.log("Tenant in route.js", tenant_id);
    console.log("Item count for date range:", items.length);
    console.log("Sample item for date range:88888888888888888888888888888888888888888888888888888888888888888888", items[items.length-1]);
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
