// app/api/time-tracking/compute-session-for-edit/route.js

import { TimeEditService } from "@/app/services/Time-Tracking/timeEditService";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    // normalize input to an array
    let items = [];
    if (Array.isArray(body)) items = body;
    else if (Array.isArray(body?.items)) items = body.items;
    else if (body && typeof body === "object") items = [body];

    if (!items.length) {
      return NextResponse.json(
        { ok: false, error: "No payload items provided." },
        { status: 400 }
      );
    }

    // minimal validation
    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      if (it.serial_id == null) {
        return NextResponse.json(
          { ok: false, error: `Item #${i}: missing field "serial_id".` },
          { status: 400 }
        );
      }
    }

    const svc = new TimeEditService();
    const rows = await svc.recomputeSessionForEditMany(items);

    return NextResponse.json(
      { ok: true, updated: rows.length, rows },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/time-tracking/compute-session-for-edit failed:", err);
    const status = err?.statusCode || 500;
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status }
    );
  }
}
