// app/api/tasks/busy-or-not/route.js
import { NextResponse } from "next/server";
import { TaskService } from "@/app/services/Task/taskService";

const taskService = new TaskService();

export async function POST(req) {
  try {
    const body = await req.json();

    const tenant_id = body?.tenant_id;
    const tenantIdNum = Number(tenant_id);
    if (!Number.isFinite(tenantIdNum) || tenantIdNum <= 0) {
      return NextResponse.json(
        { ok: false, error: "tenant_id must be a valid number." },
        { status: 400 }
      );
    }

    const raw = body?.serial_id ?? body?.serial_ids ?? body?.taskIdOfSerialIds;

    // normalize into number[]
    let taskIdOfSerialIds = [];
    if (Array.isArray(raw)) {
      taskIdOfSerialIds = raw.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    } else if (typeof raw === "number") {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) taskIdOfSerialIds = [n];
    } else if (typeof raw === "string") {
      taskIdOfSerialIds = raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
    }

    const result = taskIdOfSerialIds.length
      ? await taskService.anyBusyBySerial({ taskIdOfSerialIds, tenant_id: tenantIdNum })
      : await taskService.anyBusyByTenant({ tenant_id: tenantIdNum });

    return NextResponse.json({
      ok: true,
      any_busy: result.anyBusy,
      busy_serials: result.busySerials,
    });
  } catch (err) {
    const status = err?.statusCode || 500;
    console.error("POST /api/tasks/busy-or-not failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status }
    );
  }
}
