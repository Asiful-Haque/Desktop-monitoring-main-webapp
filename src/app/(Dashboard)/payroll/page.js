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
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
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

// Build a Cookie header string from Next cookies()
function buildCookieHeader(cookieStore) {
  const list = cookieStore.getAll();
  if (!list || list.length === 0) return "";
  return list.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
}

// Helper to fetch with cookies, even for cross-origin base URLs
async function fetchWithCookies(url, init = {}, cookieStore) {
  const headers = new Headers(init.headers || {});
  const cookieHeader = buildCookieHeader(cookieStore);
  if (cookieHeader) headers.set("Cookie", cookieHeader);
  return fetch(url, { ...init, headers, cache: "no-store" });
}

/** ----------------------- page ----------------------- **/
export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const currentUser = token ? jwt.decode(token) : null;
  const userId = currentUser ? currentUser.id : null;

  // ---- 1) Get approval status from API
  let approval = null; // number | null
  try {
    if (userId) {
      const base = process.env.NEXT_PUBLIC_MAIN_HOST || "";
      const url =
        (base ? `${base}` : "") +
        `/api/users/get-timesheet-approval?user_id=${encodeURIComponent(userId)}`;
      const res = await fetchWithCookies(url, { method: "GET" }, cookieStore);
      if (res.ok) {
        const payload = await res.json();
        approval = typeof payload?.time_sheet_approval === "number"
          ? payload.time_sheet_approval
          : Number(payload?.time_sheet_approval);
        if (!Number.isFinite(approval)) approval = null;
      } else {
        const t = await res.text().catch(() => "");
        console.error("[Payroll] approval API FAILED", res.status, res.statusText, t);
      }
    }
  } catch (e) {
    console.error("[Payroll] approval API ERROR:", e);
  }

  // ---- 2) Pull daily data (unchanged logic, but ensure cookies forwarded)
  let data = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_MAIN_HOST
      ? `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/time-sheet/by-date-range`
      : "/api/time-sheet/by-date-range";

    const body = { userId, all: false };

    const res = await fetchWithCookies(
      apiUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      cookieStore
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Payroll] timesheet API FAILED", res.status, res.statusText, text);
    } else {
      const payload = await res.json();
      const rows = Array.isArray(payload?.items) ? payload.items : [];

      // Group by local day: sum seconds and session_payment
      const dayMap = new Map(); // key -> { secs, payment, serial_ids }
      let idCounter = 1;

      for (const row of rows) {
        const startDt = parseISO(row?.task_start);
        const endDt = parseISO(row?.task_end);
        const anchor = startDt || endDt || parseISO(row?.work_date);
        if (!anchor) continue;

        const key = keyInTZ(anchor, TZ);
        const secs = computeSeconds(row);
        const pay = Number(row?.session_payment) || 0;

        if (pay === 0) continue; // skip zero-payment rows

        const agg = dayMap.get(key) || { secs: 0, payment: 0, serial_ids: [] };
        agg.secs += secs;
        agg.payment += pay;
        agg.serial_ids.push(row?.serial_id);
        dayMap.set(key, agg);
      }

      data = Array.from(dayMap.entries())
        .map(([date, { secs, payment, serial_ids }]) => ({
          id: idCounter++,
          date,
          hours: Math.round((secs / 3600) * 100) / 100,
          label: formatHMS(secs),
          payment,
          serial_ids,
        }))
        .filter((item) => item.payment > 0)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }
  } catch (err) {
    console.error("[Payroll] timesheet API ERROR:", err);
  }

  const requiresApproval = approval === 0;
  // console.log("Approval status for userId", userId, "is", approval);
  // console.log("[Payroll] requiresApproval =", requiresApproval);

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen space-y-4">
      {requiresApproval ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3">
          <div className="text-sm font-medium">
            You have to get permission from Admin to submit your Payment.
          </div>
        </div>
      ) : (
        <PayrollComponent initialDailyData={data} currentUser={currentUser} />
      )}
    </div>
  );
}
