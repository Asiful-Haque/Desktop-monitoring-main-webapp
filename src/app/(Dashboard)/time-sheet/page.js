import TimeSheet from "@/components/TimeSheet/TimeSheet";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { te } from "date-fns/locale";

export const dynamic = "force-dynamic";

/** ----------------------- helpers ----------------------- **/
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function parseISO(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
const TZ = "Asia/Dhaka";
function keyInTZ(d, timeZone = TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function fmtLocal(dt, timeZone = TZ) {
  if (!(dt instanceof Date)) return "-";
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return f.format(dt); // dd/mm/yyyy, hh:mm:ss
}
function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(
    2,
    "0"
  )}s`;
}
function computeSeconds(row) {
  const start = parseISO(row?.task_start);
  const end = parseISO(row?.task_end);
  if (start && end && end > start) {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }
  if (typeof row?.duration === "number" && !Number.isNaN(row.duration)) {
    const d = row.duration;
    if (d >= 3600000) return Math.floor(d / 1000); // ms
    if (d >= 3600) return Math.floor(d); // seconds
    if (d >= 60) return Math.floor(d * 60); // minutes
    return Math.floor(d * 60);
  }
  return 0;
}

/** ----------------------- page ----------------------- **/
export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const currentUser = token ? jwt.decode(token) : null;
  const userId = currentUser ? currentUser.id : null;
  const userName = currentUser?.name || null;
  const userRole = currentUser?.role || currentUser?.user_role || "Developer";
  const tenant_id = currentUser?.tenant_id || null;
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);
  const body = {
    startDate: ymd(start),
    endDate: ymd(end),
    all: true,
    userId,
    userRole,
    tenant_id,
  };
  const apiUrl = process.env.NEXT_PUBLIC_MAIN_HOST
    ? `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/time-sheet/by-date-range`
    : "/api/time-sheet/by-date-range";

  let rows = [];
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) {
      const payload = await res.json();
      // console.log("}}}}}}}}}}}}", payload);
      rows = Array.isArray(payload?.items) ? payload.items : [];
    } else {
      console.error(
        "Failed to load time-sheet data:",
        res.status,
        res.statusText
      );
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }

  const daySessions = new Map();
  const rolesByUserId = new Map();

  for (const row of rows) {
    const startDt = parseISO(row?.task_start);
    const endDt = parseISO(row?.task_end);
    const anchor = startDt || endDt || parseISO(row?.work_date);
    if (!anchor) continue;

    const dayKey = keyInTZ(anchor, TZ);
    const secs = computeSeconds(row);

    const leftText =
      startDt && endDt
        ? `${fmtLocal(startDt, TZ)} → ${fmtLocal(endDt, TZ)}`
        : startDt
        ? `${fmtLocal(startDt, TZ)} → —`
        : endDt
        ? `— → ${fmtLocal(endDt, TZ)}`
        : `duration only (#${row?.serial_id ?? row?.task_id ?? "?"})`;

    const serial_id = row?.serial_id ?? null;
    const project_id = row?.project_id ?? null;
    const project_name = row?.project_name ?? null;
    const task_id = row?.task_id ?? null;
    const task_name = row?.task_name ?? null;

    const item_user_id =
      row?.user_id ?? row?.dev_user_id ?? row?.developer_id ?? userId ?? null;
    const item_user_name =
      row?.user_name ?? row?.developer_name ?? userName ?? null;
    const item_role =
      String(row?.role ?? row?.developer_role ?? "")
        .trim()
        .toLowerCase() || null;
    if (Number.isFinite(item_user_id) && item_role)
      rolesByUserId.set(item_user_id, item_role);

    const flagger =
      typeof row?.flagger === "number"
        ? row.flagger
        : Number(row?.flagger ?? 0);

    const contextPrefix = `[${project_name ?? project_id ?? "Project?"}] ${
      task_name ?? task_id ?? "Task?"
    } — `;

    const item = {
      serial_id,
      seconds: secs,
      startISO: startDt ? startDt.toISOString() : null,
      endISO: endDt ? endDt.toISOString() : null,
      line: `${contextPrefix}${leftText}........... ${formatHMS(secs)}`,
      task_id,
      project_id,
      project_name,
      task_name,
      user_id: item_user_id,
      user_name: item_user_name,
      user_role: item_role,
      flagger,
      session_payment:
        typeof row?.session_payment === "number" ? row.session_payment : 0,
      tenant_id: row?.tenant_id ?? null,
    };

    const list = daySessions.get(dayKey) || [];
    list.push(item);
    daySessions.set(dayKey, list);
  }

  const detailsByDate = {};
  const data = Array.from(daySessions.entries())
    .map(([date, sessions]) => {
      detailsByDate[date] = sessions;

      const totalSecs = sessions.reduce((acc, s) => acc + s.seconds, 0);
      const hours = Math.round((totalSecs / 3600) * 100) / 100;

      // ✅ Per-session arrays (parallel)
      const serial_ids = Array.from(
        new Set(
          sessions
            .map((s) => s.serial_id)
            .filter((x) => x !== null && x !== undefined && x !== "")
        )
      );
      // collecting all info per session
      const session_payments = sessions.map((s) => s.session_payment);
      const flaggers = sessions.map((s) => s.flagger);
      const user_id = sessions.map((s) => s.user_id);

      // collecting all info per session
      const session_seconds = sessions.map((s) => Number(s.seconds) || 0);
      const session_seconds_label = sessions.map((s) =>
        formatHMS(Number(s.seconds) || 0)
      );
      // collecting all info per session
      const tenant_ids = sessions.map((s) => s.tenant_id);

      return {
        date,
        hours,
        label: formatHMS(totalSecs),
        serial_ids,
        session_payments,
        flaggers,
        user_id,
        session_seconds,
        session_seconds_label,
        tenant_ids,
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const userRolesById = Object.fromEntries(rolesByUserId);
  // console.log("sending data from page.js to TimeSheet component: @@@@@@@@@@@", data);
  // console.log("Details by date: ", detailsByDate);

  return (
    <div className="min-h-screen">
      <TimeSheet
        initialWindow={31}
        data={data} // now contains per-session seconds arrays
        detailsByDate={detailsByDate}
        userRole={userRole || "Developer"}
        userId={userId}
        userRolesById={userRolesById}
        apiUrl={apiUrl}
        currentUser={currentUser}
      />
    </div>
  );
}
