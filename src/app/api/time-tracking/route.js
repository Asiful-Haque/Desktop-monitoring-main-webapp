// app/api/time-tracking/route.js
import { NextResponse } from "next/server";
import { TimeTrackingService } from "@/app/services/Time-Tracking/TimeTrackingService";

const service = new TimeTrackingService();

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req) {
  try {
    const body = await req.json();

    // If it's an array, createMany; otherwise, createOne
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ error: "Empty array payload" }, { status: 400 });
      }
      const created = await service.createMany(body);
      return NextResponse.json(
        { ok: true, createdCount: created?.length ?? 0, items: created },
        { status: 201 }
      );
    } else {
      const created = await service.createOne(body);
      return NextResponse.json({ ok: true, item: created }, { status: 201 });
    }
  } catch (err) {
    console.error("POST /api/time-tracking failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process request" },
      { status: 400 }
    );
  }
}
