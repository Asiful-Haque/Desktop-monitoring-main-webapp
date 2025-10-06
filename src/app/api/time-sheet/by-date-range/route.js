import { NextResponse } from "next/server";
import { TimeTrackingService } from "@/app/services/Time-Tracking/TimeTrackingService";

const service = new TimeTrackingService();
console.log("TimeTrackingService initialized in /api/time-sheet/by-date-range");

// Body: { startDate, endDate, page?, pageSize?, all?: boolean }
export async function POST(req) {
  console.log("POST /api/time-sheet/by-date-range called---------------------------------");
  try {
    const { startDate, endDate, page = 1, pageSize = 10, all = false } = await req.json();

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
    }

    if (all) {
      // return ALL rows (careful with very large ranges)
      const items = await service.findByDateRangeAll({ startDate, endDate });
      return NextResponse.json({
        ok: true,
        mode: "all",
        count: items.length,
        items,
      });
    }

    // paged
    const safePageSize = Math.min(Math.max(Number(pageSize) || 10, 1), 200);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safePageSize;
    const take = safePageSize;

    const { rows, total } = await service.findByDateRangePaged({ startDate, endDate, skip, take });
    const totalPages = Math.max(Math.ceil(total / safePageSize), 1);

    return NextResponse.json({
      ok: true,
      mode: "paged",
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
      items: rows,
    });
  } catch (err) {
    console.error("POST /api/time-sheet/by-date-range failed:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
