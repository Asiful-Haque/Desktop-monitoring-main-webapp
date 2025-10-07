import TimeSheet from "@/components/TimeSheet/TimeSheet";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { use } from "react";
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

// YYYY-MM-DD for a date in the given IANA timezone
function keyInTZ(d, timeZone = TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// format date-time into local time for readable logs
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
  });
  return f.format(dt); // dd/mm/yyyy, hh:mm:ss
}

// format N seconds -> "Hh MMm SSs"
function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

// compute exact seconds for a row (count every second)
// Prefer task_start/task_end when present; else infer from duration.
function computeSeconds(row) {
  const start = parseISO(row?.task_start);
  const end = parseISO(row?.task_end);

  if (start && end && end > start) {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }

  if (typeof row?.duration === "number" && !Number.isNaN(row.duration)) {
    const d = row.duration;
    if (d >= 3600000) {
      // looks like ms
      return Math.max(0, Math.floor(d / 1000));
    }
    if (d >= 3600) {
      // plausibly seconds (>= 1h)
      return Math.max(0, Math.floor(d));
    }
    if (d >= 60) {
      // plausibly minutes
      return Math.max(0, Math.floor(d * 60));
    }
    // tiny value: treat as minutes to avoid undercount
    return Math.max(0, Math.floor(d * 60));
  }

  return 0;
}

/** ---------- pretty logging: per session then day total ---------- **/
function logPerDaySessions(daySessionsMap) {
  // sort days
  const days = Array.from(daySessionsMap.keys()).sort();

  for (const dayKey of days) {
    const sessions = daySessionsMap.get(dayKey) || [];
    if (!sessions.length) continue;

    // Print each session
    for (const s of sessions) {
      const left = `[time-sheet] ${dayKey}  ${s.leftText}`;
      const right = ` ${formatHMS(s.secs)}`;
      const TARGET = 90; // tweak width
      const dots = ".".repeat(Math.max(1, TARGET - left.length - right.length));
      console.log(left + dots + right);
    }

    // Day total
    const totalSecs = sessions.reduce((acc, s) => acc + s.secs, 0);
    const totalLeft = `[time-sheet] ${dayKey}  TOTAL`;
    const totalRight = ` ${formatHMS(totalSecs)}`;
    const TARGET = 90;
    const dots = ".".repeat(Math.max(1, TARGET - totalLeft.length - totalRight.length));
    console.log(totalLeft + dots + totalRight);
  }
}

/** ----------------------- page ----------------------- **/
export default async function Page() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const currentUser = token ? jwt.decode(token) : null;
    const userId = currentUser ? currentUser.id : null;
  
    console.log("Current User:", currentUser);
  // last 31 days (inclusive)
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

    const leftText = startDt && endDt
      ? `${fmtLocal(startDt, TZ)} → ${fmtLocal(endDt, TZ)}`
      : startDt
        ? `${fmtLocal(startDt, TZ)} → —`
        : endDt
          ? `— → ${fmtLocal(endDt, TZ)}`
          : `duration only (#${row?.serial_id ?? row?.task_id ?? "?"})`;

    const arr = daySessions.get(dayKey) || [];
    arr.push({ secs, leftText, row });
    daySessions.set(dayKey, arr);
  }

  logPerDaySessions(daySessions);

  const data = Array.from(daySessions.entries())
    .map(([date, sessions]) => {
      const totalSecs = sessions.reduce((acc, s) => acc + s.secs, 0);
      const hours = Math.round((totalSecs / 3600) * 100) / 100; // 2 decimals for thresholds
      return { date, hours, label: formatHMS(totalSecs) };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    console.log("Prepared data for TimeSheet-------------final:", data);

  return (
    <div className="min-h-screen">
      <TimeSheet initialWindow={31} data={data} />
    </div>
  );
}
