import { NextResponse } from "next/server";
import { TaskService } from "@/app/services/Task/taskService";

const taskService = new TaskService();
export async function POST(req) {
  try {
    const body = await req.json();

    // accept serial_id | serial_ids | CSV string
    const raw = body?.serial_id ?? body?.taskIdOfSerialIds;
    // normalize into number[]
    let taskIdOfSerialIds = [];
    if (Array.isArray(raw)) {
      taskIdOfSerialIds = raw.map(Number).filter(Number.isFinite);
    } else if (typeof raw === "number") {
      taskIdOfSerialIds = [raw];
    } else if (typeof raw === "string") {
      taskIdOfSerialIds = raw
        .split(",")
        .map(s => Number(s.trim()))
        .filter(Number.isFinite);
    }

    // validation
    if (!taskIdOfSerialIds.length) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload. Provide serial_id as a number, CSV string, or array." },
        { status: 400 }
      );
    }

    const result = await taskService.anyBusyBySerial({ taskIdOfSerialIds });

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
