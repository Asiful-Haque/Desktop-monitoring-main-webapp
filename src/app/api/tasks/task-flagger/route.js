import { NextResponse } from "next/server";
import { TaskService } from "@/app/services/Task/taskService";

const taskService = new TaskService();
/**
 * POST /api/tasks/flagger
 * Body:
 * {
 *   "user_id": number,
 *   "edit_task_id": number,
 *   "flagger": 0 | 1,
 *   // optional multi-tenant
 *   "tenant_id": number
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const userId = Number(body?.user_id);
    const taskId = Number(body?.edit_task_id);
    const flagger = Number(body?.flagger);
    const tenantId = body?.tenant_id ? Number(body.tenant_id) : undefined;

    if (!userId || !taskId || (flagger !== 0 && flagger !== 1)) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload.. Expect { user_id, edit_task_id, flagger: 0|1, tenant_id? }" },
        { status: 400 }
      );
    }

    let result;
    if (flagger === 1) {
      result = await taskService.flag({ userId, taskId, tenantId });
      return NextResponse.json({
        ok: true,
        message: "Flag set: cleared any existing flagged task(s) for this user; target task flagged.",
        ...result,
      });
    } else {
      result = await taskService.unflag({ userId, taskId, tenantId });
      return NextResponse.json({
        ok: true,
        message: "Flag cleared for target task.",
        ...result,
      });
    }
  } catch (err) {
    const status = err?.statusCode || 500;
    console.error("POST /api/tasks/flagger failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status }
    );
  }
}
