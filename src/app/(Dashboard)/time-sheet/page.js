import TimeSheet from "@/components/TimeSheet/TimeSheet";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
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
    if (d >= 3600) return Math.floor(d);           // seconds
    if (d >= 60) return Math.floor(d * 60);        // minutes
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

  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);

  const body = {
    startDate: ymd(start),
    endDate: ymd(end),
    all: true,
    userId,
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
      rows = Array.isArray(payload?.items) ? payload.items : [];
    } else {
      console.error("Failed to load time-sheet data:", res.status, res.statusText);
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }

  const daySessions = new Map();

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
    const project_name = row?.project_name ?? null; // <--- from JOIN
    const task_name = row?.task_name ?? null;       // <--- from JOIN

    // Prefix line with Project/Task for recognizability:
    const contextPrefix = `[${project_name ?? row?.project_id ?? "Project?"}] ${task_name ?? row?.task_id ?? "Task?"} — `;

    const item = {
      serial_id,
      seconds: secs,
      startISO: startDt ? startDt.toISOString() : null,
      endISO: endDt ? endDt.toISOString() : null,
      line: `${contextPrefix}${leftText}........... ${formatHMS(secs)}`,
      task_id: row?.task_id ?? null,
      project_id: row?.project_id ?? null,
      project_name,
      task_name,
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
      return { date, hours, label: formatHMS(totalSecs) };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return (
    <div className="min-h-screen">
      <TimeSheet initialWindow={31} data={data} detailsByDate={detailsByDate} />
    </div>
  );
}
