// src/lib/timesheet-utils.js

/* --------------------- General helpers --------------------- */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
export function normalizeAndSort(src) {
  const normalized = (src ?? []).map((d) => ({
    date: d.date instanceof Date ? d.date : new Date(d.date),
    hours: typeof d.hours === "number" ? d.hours : undefined,
    label: d.label,
  }));
  normalized.sort((a, b) => +a.date - +b.date);
  return normalized;
}
export function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
export function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  const diff = Math.ceil((+b - +a) / (24 * 3600 * 1000)) + 1;
  return Math.max(0, diff);
}

/* -------------------- Timezone + windows -------------------- */
export const TZ = "Asia/Dhaka";
export function todayInTZ(timeZone = TZ) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return new Date(`${obj.year}-${obj.month}-${obj.day}T00:00:00`);
}
export function buildFixedWindowSeries(windowDays, timeZone = TZ) {
  const anchor = todayInTZ(timeZone);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - (windowDays - 1));
  const series = [];
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    series.push({ date: d, hours: undefined, label: undefined });
  }
  return series;
}

/* --------------------- Sparkline builder --------------------- */
export function buildSparkPath(points, width = 240, height = 48, maxY = 9) {
  if (!points.length) return "";
  const stepX = width / Math.max(points.length - 1, 1);
  const safeMax = Math.max(1, maxY);
  const yOf = (v) => height - (Math.min(v ?? 0, safeMax) / safeMax) * height;
  return points
    .map((p, i) => {
      const x = i * stepX;
      const y = yOf(typeof p === "number" ? p : 0);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

/* ------------------------ UI helpers ------------------------ */
export function getHourRangeTone(hours) {
  if (typeof hours !== "number") return "";
  if (hours <= 3) return "text-rose-600 dark:text-rose-400";
  if (hours <= 7) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}
export function getCardBackground(hours) {
  if (typeof hours !== "number") return "bg-white dark:bg-neutral-900";
  if (hours <= 3)
    return "bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-neutral-900";
  if (hours <= 7)
    return "bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-neutral-900";
  return "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-neutral-900";
}
export function getCardRibbon(hours) {
  if (typeof hours !== "number") return "bg-neutral-200 dark:bg-neutral-700";
  if (hours <= 3) return "bg-rose-500/80 dark:bg-rose-400/70";
  if (hours <= 7) return "bg-amber-500/80 dark:bg-amber-400/70";
  return "bg-emerald-500/80 dark:bg-emerald-400/70";
}
export function getCardBorder(hours) {
  if (typeof hours !== "number")
    return "border-neutral-300 dark:border-neutral-700";
  if (hours <= 3) return "border-rose-200 dark:border-rose-800/50";
  if (hours <= 7) return "border-amber-200 dark:border-amber-800/50";
  return "border-emerald-200 dark:border-emerald-800/50";
}
export function getBadgeClasses(hours) {
  if (typeof hours !== "number")
    return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
  if (hours <= 3)
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300";
  if (hours <= 7)
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
}
export function getRangeLabel(hours) {
  if (typeof hours !== "number") return "—";
  if (hours <= 3) return "Light (0–3h)";
  if (hours <= 7) return "Steady (4–7h)";
  return "Heavy (7–9+h)";
}
export function progressPercent(hours) {
  const h = typeof hours === "number" ? Math.max(0, Math.min(9, hours)) : 0;
  return Math.round((h / 9) * 100);
}

/* -------------------- Aggregation helpers -------------------- */
export function secondsToLabel(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}
export function roundHours2(sec) {
  return Math.round((sec / 3600) * 100) / 100;
}
export function sumSecondsFor(filters, rows) {
  const { projectId, userId } = filters;
  let target = rows;
  if (projectId !== "all")
    target = target.filter((r) => r.project_id === projectId);
  if (userId !== "all") target = target.filter((r) => r.user_id === userId);
  return target.reduce((sum, r) => sum + (r.seconds || 0), 0);
}
export function buildFilteredSeries(baseSeries, detailsByDate, projectId, userId) {
  if (!baseSeries?.length || !detailsByDate) return baseSeries ?? [];
  return baseSeries.map((d) => {
    const k = keyOf(d.date);
    const rows = detailsByDate[k] || [];
    const sec = sumSecondsFor({ projectId, userId }, rows);
    const hours = sec > 0 ? roundHours2(sec) : undefined;
    const label = sec > 0 ? secondsToLabel(sec) : undefined;
    return { date: d.date, hours, label };
  });
}

/* -------------------- Time conversion utils -------------------- */
export function isoToLocalHMS(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const obj = Object.fromEntries(f.map((p) => [p.type, p.value]));
  return `${obj.hour ?? "00"}:${obj.minute ?? "00"}:${obj.second ?? "00"}`;
}
export function combineDateWithHMS(isoBase, hms) {
  if (!isoBase || !hms) return null;
  const base = new Date(isoBase);
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(base);
  const objD = Object.fromEntries(dateParts.map((p) => [p.type, p.value]));
  const ymd = `${objD.year}-${objD.month}-${objD.day}`;
  const [HH, MM, SS] = hms.split(":").map((x) => parseInt(x || "0", 10));
  const local = new Date(
    `${ymd}T${String(HH).padStart(2, "0")}:${String(MM).padStart(2, "0")}:${String(SS).padStart(2, "0")}`
  );
  return local.toISOString();
}
export function diffSecondsISO(startISO, endISO) {
  if (!startISO || !endISO) return 0;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  return Math.max(0, Math.floor((b - a) / 1000));
}

/* -------------------- Admin data helpers -------------------- */
export function parseISO2(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function keyInTZ(d, timeZone = TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function computeSecondsFromRow(row) {
  const start = parseISO2(row?.task_start);
  const end = parseISO2(row?.task_end);
  if (start && end && end > start) {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }
  const d = row?.duration;
  if (typeof d === "number" && !Number.isNaN(d)) {
    if (d >= 3600000) return Math.floor(d / 1000); // ms
    if (d >= 3600) return Math.floor(d);          // seconds
    if (d >= 60) return Math.floor(d * 60);       // minutes -> seconds
    return Math.floor(d * 60);
  }
  return 0;
}

/* --------------- Old daily payroll helpers ----------------- */
export function buildDailyPayablesForUser(detailsByDate, userId) {
  if (!detailsByDate || userId == null) return [];
  const datesAsc = Object.keys(detailsByDate).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  const out = [];
  let runningId = 1;
  for (const date of datesAsc) {
    const sessions = detailsByDate[date] || [];
    const mine = (sessions || []).filter(
      (s) => Number(s?.user_id) === Number(userId) && Number(s?.flagger) === 0
    );
    if (!mine.length) continue;
    const totalSecs = mine.reduce((acc, s) => acc + (Number(s?.seconds) || 0), 0);
    if (totalSecs <= 0) continue;
    const hours = Math.round((totalSecs / 3600) * 100) / 100;
    const label = secondsToLabel(totalSecs);
    const payment = mine.reduce((acc, s) => acc + (Number(s?.session_payment) || 0), 0);
    const serial_ids = mine.map((s) => s?.serial_id).filter((x) => x != null && x !== "");
    out.push({ id: runningId++, date, hours, label, payment, serial_ids });
  }
  return out;
}
export function hasAnyFlaggerZeroForUser(detailsByDate, userId) {
  if (!detailsByDate || userId == null) return false;
  for (const sessions of Object.values(detailsByDate)) {
    for (const s of sessions) {
      if (Number(s?.user_id) === Number(userId) && Number(s?.flagger) === 0) {
        return true;
      }
    }
  }
  return false;
}

/* --------------- Current-month grouping helpers -------------- */
export const CURRENT_TZ = "Asia/Dhaka";
export function currentMonthKey(timeZone = CURRENT_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${obj.year}-${obj.month}`; // e.g., "2025-11"
}
export function bucketForDay(day) {
  if (day >= 1 && day <= 7) return "1-7";
  if (day >= 8 && day <= 15) return "8-15";
  if (day >= 16 && day <= 23) return "16-23";
  return "24-31";
}
/* --------------- Current-month payment grouping --------------- */
export function groupCurrentMonthForPayment(data, timeZone = CURRENT_TZ) {
  const month = currentMonthKey(timeZone);
  const out = { month };
  if (!Array.isArray(data) || data.length === 0) return out;

  // Keep only current-month entries (expects YYYY-MM-DD in data[i].date)
  const monthItems = data.filter((d) =>
    String(d?.date ?? "").startsWith(`${month}-`)
  );

  // Collect developer ids seen this month
  const devSet = new Set();
  for (const day of monthItems) {
    (day.user_id || []).forEach((uid) => devSet.add(Number(uid)));
  }
  for (const devId of devSet) {
    out[devId] = out[devId] || {
      "1-7": [],
      "8-15": [],
      "16-23": [],
      "24-31": [],
    };
  }

  // Bucket each day by developer, keeping only sessions with flagger === 0
  for (const day of monthItems) {
    const ymd = String(day.date);
    const dayNum = Number(ymd.slice(-2));
    const bucket = bucketForDay(dayNum);

    const serials = day.serial_ids || [];
    const pays = day.session_payments || [];
    const flags = day.flaggers || [];
    const users = day.user_id || [];
    const secsArr = day.session_seconds || [];

    // indices per developer for that day
    const byDev = new Map();
    for (let i = 0; i < users.length; i++) {
      const dev = Number(users[i]);
      if (!byDev.has(dev)) byDev.set(dev, []);
      byDev.get(dev).push(i);
    }

    for (const [dev, idxs] of byDev.entries()) {
      const devSerials = [];
      const devFlaggers = [];
      const devUsers = [];
      const devPays = [];
      let devSeconds = 0;

      for (const i of idxs) {
        const fl = Number(flags[i] || 0);
        if (fl !== 0) continue; // ✅ payable only
        devSerials.push(serials[i]);
        devPays.push(Number(pays[i] || 0));
        devFlaggers.push(fl);
        devUsers.push(Number(users[i]));
        devSeconds += Number(secsArr[i] || 0);
      }

      if (devSerials.length === 0) continue; // nothing payable for this dev/day

      const hours = roundHours2(devSeconds);
      const label = secondsToLabel(devSeconds);
      const payment =
        Math.round(devPays.reduce((acc, p) => acc + (Number(p) || 0), 0) * 100) /
        100;

      const entry = {
        date: ymd,
        hours,
        label,
        serial_ids: devSerials,
        session_payments: devPays,
        flaggers: devFlaggers,
        user_id: devUsers,
        payment,
      };

      out[dev][bucket].push(entry);
    }
  }

  return out;
}
