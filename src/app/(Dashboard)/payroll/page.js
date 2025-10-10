import { cookies } from "next/headers";
import PayrollComponent from "@/components/Payroll/PayrollComponent";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

/** ----------------------- helpers ----------------------- **/
const TZ = "Asia/Dhaka";

function parseISO(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// YYYY-MM-DD in TZ
function keyInTZ(d, timeZone = TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// format N seconds -> "Hh MMm SSs"
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

// Prefer task_start/task_end; else infer from duration
function computeSeconds(row) {
  const start = parseISO(row?.task_start);
  const end = parseISO(row?.task_end);

  if (start && end && end > start) {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }

  const d = row?.duration;
  if (typeof d === "number" && !Number.isNaN(d)) {
    if (d >= 3600000) return Math.max(0, Math.floor(d / 1000)); // ms
    if (d >= 3600) return Math.max(0, Math.floor(d)); // sec
    if (d >= 60) return Math.max(0, Math.floor(d * 60)); // min
    return Math.max(0, Math.floor(d * 60)); // tiny → min
  }

  return 0;
}

/** ----------------------- page ----------------------- **/
export default async function Page() {
  // derive userId
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const currentUser = token ? jwt.decode(token) : null;
  const userId = currentUser ? currentUser.id : null;

  let data = [];
  const apiUrl = process.env.NEXT_PUBLIC_MAIN_HOST
    ? `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/time-sheet/by-date-range`
    : "/api/time-sheet/by-date-range";

  const body = {
    userId,
    all: false, // ← no pagination & no dates required in your API
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Payroll] API call FAILED", res.status, res.statusText, text);
    } else {
      const payload = await res.json();
      const rows = Array.isArray(payload?.items) ? payload.items : [];

      // Group by local day: sum seconds and session_payment
      const dayMap = new Map(); // key -> { secs, payment, serial_ids }
      for (const row of rows) {
        const startDt = parseISO(row?.task_start);
        const endDt = parseISO(row?.task_end);
        const anchor = startDt || endDt || parseISO(row?.work_date);
        if (!anchor) continue;

        const key = keyInTZ(anchor, TZ);
        const secs = computeSeconds(row);
        const pay = Number(row?.session_payment) || 0;

        if (pay === 0) continue; // Filter out rows where payment is 0

        // Retrieve the current day entry from the map (if it exists)
        const agg = dayMap.get(key) || { secs: 0, payment: 0, serial_ids: [] };

        // Update the aggregated values (seconds and payment)
        agg.secs += secs;
        agg.payment += pay;

        // Add the serial_id to the session details
        agg.serial_ids.push(row?.serial_id); // Include the serial_id here

        // Set or update the entry for the specific day
        dayMap.set(key, agg);
      }

      data = Array.from(dayMap.entries())
        .map(([date, { secs, payment, serial_ids }]) => ({
          date,
          hours: Math.round((secs / 3600) * 100) / 100,
          label: formatHMS(secs),
          payment,
          serial_ids, // Include the list of serial_ids for each day
        }))
        .filter((item) => item.payment > 0) // Filter out rows with zero payment after aggregation
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      
    }
  } catch (err) {
    console.error("[Payroll] API call ERROR:", err);
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <PayrollComponent initialDailyData={data} currentUser={currentUser} />
    </div>
  );
}
