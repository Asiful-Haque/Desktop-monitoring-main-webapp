// app/api/time-tracking/apply-edits/route.js
import { TimeEditService } from "@/app/services/Time-Tracking/timeEditService";
import { NextResponse } from "next/server";

/**
 * POST /api/time-tracking/apply-edits
 * Body:
 * {
 *   context: { dateKey, reason, timezone },
 *   tenant_id?: number,
 *   changes: [
 *     {
 *       serial_id: number,
 *       task_id: number,
 *       project_id?: number,
 *       new: { startISO: string, endISO: string, seconds: number }
 *     }, ...
 *   ]
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const context = body?.context || {};
    const changes = Array.isArray(body?.changes) ? body.changes : [];
    const tenantId = body?.tenant_id != null ? Number(body.tenant_id) : undefined;

    if (!changes.length) {
      return NextResponse.json(
        { ok: false, error: "No changes provided." },
        { status: 400 }
      );
    }

    // Minimal shape validation; service validates again
    for (const [i, c] of changes.entries()) {
      if (
        !c?.serial_id ||
        !c?.task_id ||
        !c?.new?.startISO ||
        !c?.new?.endISO ||
        typeof c?.new?.seconds !== "number"
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: `Invalid change at index ${i}: serial_id, task_id, new.startISO, new.endISO, new.seconds required.`,
          },
          { status: 400 }
        );
      }
    }

    const svc = new TimeEditService();
    const result = await svc.applyEdits({ changes, context, tenantId });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const status = err?.statusCode || 500;
    console.error("POST /api/time-tracking/apply-edits failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status }
    );
  }
}
