// TimeSheet.js — adds Freelancer approval flow (toast + Approve button)
// No TS. Client component.

"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Clock,
  TrendingUp,
  Pencil,
  Calendar as CalendarIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import TimeSheetEditModal from "../TimeSheetEditModal";

/* ---------- utils ---------- */
const TZ = "Asia/Dhaka";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfDayInTZ(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((a, p) => ((a[p.type] = p.value), a), {});
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00`);
}
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function normalizeAndSort(src) {
  const normalized = (src ?? []).map((d) => ({
    date: d.date instanceof Date ? startOfDayInTZ(d.date, TZ) : startOfDayInTZ(new Date(d.date), TZ),
    hours: typeof d.hours === "number" ? d.hours : undefined,
    label: d.label,
  }));
  normalized.sort((a, b) => +a.date - +b.date);
  return normalized;
}
function keyOf(d) {
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
  return f.format(dt);
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
    if (d >= 3600000) return Math.floor(d / 1000); // ms → sec
    if (d >= 3600) return Math.floor(d); // seconds
    if (d >= 60) return Math.floor(d * 60); // min → sec
    return Math.floor(d * 60); // assume minutes
  }
  return 0;
}

/* ---------- series + visuals ---------- */
function buildWindowSeries(allData, windowDays, anchorISO) {
  const data = allData ?? [];
  const map = new Map();
  for (const r of data) map.set(keyOf(r.date), { hours: r.hours, label: r.label });

  const anchor = anchorISO ? startOfDay(new Date(anchorISO)) : startOfDayInTZ(new Date(), TZ);
  const start = addDays(anchor, -(windowDays - 1)); // inclusive

  const series = [];
  for (let i = 0; i < windowDays; i++) {
    const d = addDays(start, i);
    const k = keyOf(d);
    const v = map.get(k) || {};
    series.push({ date: d, hours: v.hours, label: v.label });
  }
  return series;
}
function buildSparkPath(points, width = 240, height = 48, maxY = 8) {
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
function getBoxChrome(hours) {
  return typeof hours === "number"
    ? "border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
    : "border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400";
}
function getHourTextTone(hours) {
  if (typeof hours !== "number") return "";
  if (hours <= 3) return "text-rose-600 dark:text-rose-400";
  if (hours <= 5) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}
function secondsToLabel(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}
function roundHours2(sec) {
  return Math.round((sec / 3600) * 100) / 100;
}
function sumSecondsForFilters(items, projectId, developerId) {
  const projIdNum = projectId === "all" ? "all" : Number(projectId);
  const devIdNum = developerId === "all" ? "all" : Number(developerId);

  return items
    .filter((r) => (projIdNum === "all" ? true : Number(r.project_id) === projIdNum))
    .filter((r) => (devIdNum === "all" ? true : Number(r.developer_id) === devIdNum))
    .reduce((sum, r) => sum + (r.seconds || 0), 0);
}
function buildFilteredSeries(baseSeries, detailsByDate, projectId, developerId) {
  if (!baseSeries?.length || !detailsByDate) return baseSeries || [];
  if (projectId === "all" && developerId === "all") return baseSeries;
  return baseSeries.map((d) => {
    const k = keyOf(d.date);
    const rows = detailsByDate[k] || [];
    const sec = sumSecondsForFilters(rows, projectId, developerId);
    const hours = sec > 0 ? roundHours2(sec) : undefined;
    const label = sec > 0 ? secondsToLabel(sec) : undefined;
    return { date: d.date, hours, label };
  });
}

/* ---------- time helpers for modal ---------- */
function isoToLocalHMS(iso) {
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
function combineDateWithHMS(isoBase, hms) {
  if (!isoBase || !hms) return null;
  const base = new Date(isoBase);
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(base);
  const objD = Object.fromEntries(dateParts.map((p) => [p.type, p.value]));
  const ymdStr = `${objD.year}-${objD.month}-${objD.day}`;
  const [HH, MM, SS] = hms.split(":").map((x) => parseInt(x || "0", 10));
  const local = new Date(`${ymdStr}T${String(HH).padStart(2, "0")}:${String(MM).padStart(2, "0")}:${String(SS).padStart(2, "0")}`);
  return local.toISOString();
}
function diffSecondsISO(startISO, endISO) {
  if (!startISO || !endISO) return 0;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  return Math.max(0, Math.floor((b - a) / 1000));
}

/** API helper */
async function checkAnyBusy(taskIdOfSerialIds) {
  if (!taskIdOfSerialIds?.length) return { any_busy: false, busy_serials: [] };
  const res = await fetch("/api/tasks/busy-or-not", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskIdOfSerialIds }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Busy check failed");
  return json;
}

/* ======================================
   MAIN
====================================== */
export default function TimeSheet({
  initialWindow,
  data,
  detailsByDate,
  userRole,
  apiUrl = (process.env.NEXT_PUBLIC_MAIN_HOST
    ? `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/time-sheet/by-date-range`
    : "/api/time-sheet/by-date-range"),
  userId = null,
}) {
  const router = useRouter();
  const isDeveloper = String(userRole || "").toLowerCase() === "developer";
  const isAdmin = String(userRole || "").toLowerCase() === "admin";
  const isFreelancerViewer = String(userRole || "").toLowerCase() === "freelancer";

  const [localDetails, setLocalDetails] = useState(detailsByDate || {});
  const [clientData, setClientData] = useState(normalizeAndSort(data || []));

  // Visual window
  const [windowDays, setWindowDays] = useState([7, 15, 31].includes(initialWindow) ? initialWindow : 7);
  const [anchorISO, setAnchorISO] = useState(null);

  // Custom page (>31 days)
  const [customMeta, setCustomMeta] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => setLocalDetails(detailsByDate || {}), [detailsByDate]);
  useEffect(() => setClientData(normalizeAndSort(data || [])), [data]);

  const baseWindowSeries = useMemo(
    () => buildWindowSeries(clientData, windowDays, anchorISO),
    [clientData, windowDays, anchorISO]
  );

  /* ---------- Build developer/project filters ---------- */
  // Build roles map from localDetails (rows may carry .role per item)
  const userRolesById = useMemo(() => {
    const map = new Map();
    for (const list of Object.values(localDetails || {})) {
      for (const r of list) {
        if (Number.isFinite(Number(r?.developer_id))) {
          const role = (r?.role || r?.developer_role || "").toString().trim().toLowerCase();
          if (role) map.set(Number(r.developer_id), role);
        }
      }
    }
    return map;
  }, [localDetails]);

  const projectOptions = useMemo(() => {
    const map = new Map();
    if (localDetails) {
      for (const arr of Object.values(localDetails)) {
        for (const r of arr) {
          if (Number.isFinite(Number(r.project_id)))
            map.set(Number(r.project_id), r.project_name || `Project ${r.project_id}`);
        }
      }
    }
    return [{ id: "all", name: "All projects" }, ...Array.from(map, ([id, name]) => ({ id, name }))];
  }, [localDetails]);

  const developerOptions = useMemo(() => {
    if (isDeveloper) return [{ id: "all", name: "All users" }];
    const map = new Map();
    if (localDetails) {
      for (const arr of Object.values(localDetails)) {
        for (const r of arr) {
          if (Number.isFinite(Number(r.developer_id))) {
            const id = Number(r.developer_id);
            const labelRole = (userRolesById.get(id) || "").toString();
            const roleBadge = labelRole ? ` (${labelRole})` : "";
            const name = `${r.developer_name || `User ${id}`}${roleBadge}`;
            if (!map.has(id)) map.set(id, name);
          }
        }
      }
    }
    return [{ id: "all", name: "All users" }, ...Array.from(map, ([id, name]) => ({ id, name }))];
  }, [localDetails, isDeveloper, userRolesById]);

  const [selectedProject, setSelectedProject] = useState(projectOptions[0]?.id ?? "all");
  const [selectedDeveloper, setSelectedDeveloper] = useState(developerOptions[0]?.id ?? "all");

  useEffect(() => {
    const pids = new Set(projectOptions.map((p) => String(p.id)));
    if (!pids.has(String(selectedProject))) setSelectedProject("all");
  }, [projectOptions, selectedProject]);
  useEffect(() => {
    const dids = new Set(developerOptions.map((d) => String(d.id)));
    if (!dids.has(String(selectedDeveloper))) setSelectedDeveloper("all");
  }, [developerOptions, selectedDeveloper]);

  const effectiveDeveloper = isDeveloper ? "all" : selectedDeveloper;

  const windowSeries = useMemo(
    () => buildFilteredSeries(baseWindowSeries, localDetails, selectedProject, effectiveDeveloper),
    [baseWindowSeries, localDetails, selectedProject, effectiveDeveloper]
  );

  const hasData = windowSeries.length > 0;
  const daysWithHours = useMemo(() => windowSeries.filter((d) => typeof d.hours === "number"), [windowSeries]);
  const sparkPoints = windowSeries.map((d) => (typeof d.hours === "number" ? d.hours : 0));

  const rangeButtons = [
    { label: "Weekly", value: 7 },
    { label: "15 Days", value: 15 },
    { label: "Monthly", value: 31 },
  ];

  /* ---------- Custom range (Admin only) ---------- */
  const [showCustom, setShowCustom] = useState(false);
  const todayDhaka = ymd(startOfDayInTZ(new Date(), TZ));
  const defaultFrom = useMemo(() => {
    const end = new Date(`${todayDhaka}T00:00:00`);
    const start = addDays(end, -30);
    return ymd(start);
  }, [todayDhaka]);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(todayDhaka);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customError, setCustomError] = useState("");

  async function fetchCustomRange() {
    if (!isAdmin) return;
    setCustomError("");
    if (!fromDate || !toDate) {
      setCustomError("Please select both From and To dates.");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      setCustomError("From date must be earlier than or equal to To date.");
      return;
    }

    const body = { startDate: fromDate, endDate: toDate, all: true, userId, userRole };
    try {
      setLoadingCustom(true);
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (!res.ok) {
        setCustomError(`Failed to load data: ${res.status} ${res.statusText}`);
        return;
      }
      const payload = await res.json();
      const rows = Array.isArray(payload?.items) ? payload.items : [];

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
        const project_name = row?.project_name ?? null;
        const task_name = row?.task_name ?? null;
        const developer_id = Number(row?.developer_id ?? null);
        const developer_name = row?.developer_name ?? null;
        const flagger = typeof row?.flagger === "number" ? row.flagger : Number(row?.flagger ?? 0);
        const role = (row?.role || row?.developer_role || "").toString().toLowerCase();

        const contextPrefix = `[${project_name ?? row?.project_id ?? "Project?"}] ${task_name ?? row?.task_id ?? "Task?"} — `;
        const item = {
          serial_id,
          seconds: secs,
          startISO: startDt ? startDt.toISOString() : null,
          endISO: endDt ? endDt.toISOString() : null,
          line: `${contextPrefix}${leftText}........... ${formatHMS(secs)}`,
          task_id: row?.task_id ?? null,
          project_id: Number(row?.project_id ?? null),
          project_name,
          task_name,
          developer_id,
          developer_name,
          role,
          flagger,
        };

        const list = daySessions.get(dayKey) || [];
        list.push(item);
        daySessions.set(dayKey, list);
      }

      const newDetails = {};
      const newData = Array.from(daySessions.entries())
        .map(([date, sessions]) => {
          newDetails[date] = sessions;
          const totalSecs = sessions.reduce((acc, s) => acc + s.seconds, 0);
          const hours = Math.round((totalSecs / 3600) * 100) / 100;
          return { date, hours, label: formatHMS(totalSecs) };
        })
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

      setLocalDetails(newDetails);
      setClientData(normalizeAndSort(newData));

      const fromD = startOfDay(new Date(`${fromDate}T00:00:00`));
      const toD = startOfDay(new Date(`${toDate}T00:00:00`));
      const totalDays = Math.max(1, Math.floor((toD - fromD) / 86400000) + 1);

      setCustomMeta({ from: fromD, to: toD, totalDays });
      setPageIndex(0);
      setAnchorISO(toD.toISOString());

      const firstWindow = Math.min(31, totalDays);
      setWindowDays(firstWindow);

      setShowCustom(false);
    } catch (e) {
      setCustomError(`Fetch failed: ${e?.message || e}`);
    } finally {
      setLoadingCustom(false);
    }
  }

  function selectPreset(days) {
    setWindowDays(days);
    setAnchorISO(null);
    setCustomMeta(null);
    setPageIndex(0);
  }

  const showCardPager = isAdmin && !!customMeta && customMeta.totalDays > 31;
  const pageCount = showCardPager ? Math.ceil(customMeta.totalDays / 31) : 1;

  function updatePage(newIndex) {
    if (!customMeta || !isAdmin) return;
    const clamped = Math.max(0, Math.min(newIndex, pageCount - 1));
    const pageEnd = addDays(customMeta.to, -31 * clamped);
    const oldestPossibleStart = addDays(pageEnd, -30);
    const pageStart = oldestPossibleStart < customMeta.from ? customMeta.from : oldestPossibleStart;
    const pageWindow = Math.max(1, Math.floor((startOfDay(pageEnd) - startOfDay(pageStart)) / 86400000) + 1);

    setPageIndex(clamped);
    setAnchorISO(startOfDay(pageEnd).toISOString());
    setWindowDays(pageWindow);
  }
  function pagePrev() {
    if (!showCardPager) return;
    if (pageIndex < pageCount - 1) updatePage(pageIndex + 1);
  }
  function pageNext() {
    if (!showCardPager) return;
    if (pageIndex > 0) updatePage(pageIndex - 1);
  }

  /* ---------- Day details / modal ---------- */
  const [details, setDetails] = useState(null);
  function openDetails(day) {
    const dateKey = keyOf(day.date);
    const srcItemsAll = localDetails?.[dateKey] || [];
    const byProject =
      selectedProject === "all"
        ? srcItemsAll
        : srcItemsAll.filter((it) => Number(it.project_id) === Number(selectedProject));

    const byProjectAndDev =
      effectiveDeveloper === "all"
        ? byProject
        : byProject.filter((it) => Number(it.developer_id) === Number(effectiveDeveloper));

    const sec = byProjectAndDev.reduce((s, r) => s + (r.seconds || 0), 0);
    const totalLabel = sec > 0 ? secondsToLabel(sec) : "";

    const items = byProjectAndDev.map((it) => {
      const startHMS = isoToLocalHMS(it.startISO);
      const endHMS = isoToLocalHMS(it.endISO);
      return {
        ...it,
        flagger: Number(it?.flagger ?? 0),
        startHMS,
        endHMS,
        newStartHMS: startHMS,
        newEndHMS: endHMS,
        newStartISO: it.startISO,
        newEndISO: it.endISO,
        newSeconds: it.seconds ?? diffSecondsISO(it.startISO, it.endISO),
      };
    });

    setDetails({ dateKey, dateObj: day.date, items, totalLabel, reason: "" });
  }
  function closeDetails() {
    setDetails(null);
  }
  function updateItemTime(idx, field, hms) {
    setDetails((s) => {
      if (!s) return s;
      const items = [...s.items];
      const row = { ...items[idx] };
      if (field === "start") {
        row.newStartHMS = hms;
        row.newStartISO = combineDateWithHMS(row.startISO || row.endISO, hms);
      } else {
        row.newEndHMS = hms;
        row.newEndISO = combineDateWithHMS(row.endISO || row.startISO, hms);
      }
      row.newSeconds = diffSecondsISO(row.newStartISO, row.newEndISO);
      items[idx] = row;
      return { ...s, items };
    });
  }
  function onReasonChange(e) {
    setDetails((s) => (s ? { ...s, reason: e.target.value } : s));
  }
  function onSubmitChanges() {
    if (!details) return;
    const changes = details.items
      .filter((it) => it.newStartISO !== it.startISO || it.newEndISO !== it.endISO)
      .map((it) => ({
        serial_id: it.serial_id,
        project_id: it.project_id,
        task_id: it.task_id,
        old: { startISO: it.startISO, endISO: it.endISO, seconds: it.seconds },
        new: { startISO: it.newStartISO, endISO: it.newEndISO, seconds: it.newSeconds },
      }));
    const payload = { dateKey: details.dateKey, reason: details.reason.trim(), timezone: TZ, changes };
    console.log("Submit TimeSheet Changes payload:", payload);
    alert("Payload logged in console. Wire this to your update API.");
    closeDetails();
  }

  const [checkingBusy, setCheckingBusy] = useState(false);
  async function handleEditIconClick(day) {
    if (checkingBusy) return;
    try {
      setCheckingBusy(true);
      const dateKey = keyOf(day.date);
      const all = localDetails?.[dateKey] || [];
      const filteredByProj =
        selectedProject === "all"
          ? all
          : all.filter((it) => Number(it.project_id) === Number(selectedProject));

      const filtered =
        effectiveDeveloper === "all"
          ? filteredByProj
          : filteredByProj.filter((it) => Number(it.developer_id) === Number(effectiveDeveloper));

      const taskIdOfSerialIds = filtered.map((it) => it.task_id).filter((x) => Number.isFinite(Number(x)));
      const { any_busy, busy_serials } = await checkAnyBusy(taskIdOfSerialIds);

      if (any_busy) {
        alert(
          busy_serials?.length
            ? `Some task(s) are currently running (serial: ${busy_serials.join(", ")}). Please stop them first.`
            : "Some task(s) are currently running. Please stop them first."
        );
        return;
      }

      openDetails(day);
    } catch (e) {
      console.error("Busy check error:", e);
      alert(`Could not verify running tasks. ${e?.message || ""}`);
    } finally {
      setCheckingBusy(false);
    }
  }

  // Header label
  const headerRangeText = useMemo(() => {
    const end = anchorISO ? startOfDay(new Date(anchorISO)) : startOfDayInTZ(new Date(), TZ);
    const start = addDays(end, -(windowDays - 1));
    const left = format(start, "EEE\nd", { locale: enUS });
    const leftMonthYear = format(start, "MMM yyyy", { locale: enUS });
    const right = format(end, "EEE\nd", { locale: enUS });
    const rightMonthYear = format(end, "MMM yyyy", { locale: enUS });
    if (anchorISO) {
      return (
        <>
          <span className="whitespace-pre">{left}</span>
          <span className="mx-1">•</span>
          <span className="whitespace-pre">{leftMonthYear}</span>
          <span className="mx-2">→</span>
          <span className="whitespace-pre">{right}</span>
          <span className="mx-1">•</span>
          <span className="whitespace-pre">{rightMonthYear}</span>
        </>
      );
    }
    return <>Last {windowDays} Days (ending today)</>;
  }, [anchorISO, windowDays]);

  /* ---------- Freelancer approval flow ---------- */
  const approvalApiBase = process.env.NEXT_PUBLIC_MAIN_HOST
    ? `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/users`
    : "/api/users";

  const [approvalStatus, setApprovalStatus] = useState(null); // 1 or 0
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState("");

  const selectedRole = useMemo(() => {
    if (effectiveDeveloper === "all") return "";
    const role = (userRolesById.get(Number(effectiveDeveloper)) || "").toString().toLowerCase();
    return role;
  }, [effectiveDeveloper, userRolesById]);

  async function fetchApprovalStatus(user_id) {
    try {
      setApprovalLoading(true);
      setApprovalError("");
      setApprovalStatus(null);

      const qs = `?user_id=${encodeURIComponent(Number(user_id))}`;
      const res = await fetch(`${approvalApiBase}/get-timesheet-approval${qs}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to fetch approval status");
      const val = Number(json?.time_sheet_approval);
      setApprovalStatus(val === 1 ? 1 : 0);
    } catch (e) {
      console.error("get-timesheet-approval error:", e);
      setApprovalError(e?.message || "Failed to fetch approval status");
    } finally {
      setApprovalLoading(false);
    }
  }

  async function approveNow() {
    if (effectiveDeveloper === "all") return;
    try {
      setApprovalLoading(true);
      setApprovalError("");

      const res = await fetch(`${approvalApiBase}/set-timesheet-approval`, {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ user_id: Number(effectiveDeveloper), time_sheet_approval: 1 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update approval status");
      setApprovalStatus(1);
    } catch (e) {
      console.error("set-timesheet-approval error:", e);
      setApprovalError(e?.message || "Failed to update approval status");
    } finally {
      setApprovalLoading(false);
    }
  }

  // Auto-fetch approval status when a specific Freelancer is selected
  useEffect(() => {
    if (effectiveDeveloper === "all") {
      setApprovalStatus(null);
      setApprovalError("");
      return;
    }
    if (selectedRole === "freelancer") {
      fetchApprovalStatus(Number(effectiveDeveloper));
    } else {
      setApprovalStatus(null);
      setApprovalError("");
    }
  }, [effectiveDeveloper, selectedRole]);

  const showFreelancerUI = effectiveDeveloper !== "all" && selectedRole === "freelancer";
  const showApproveBtn = showFreelancerUI && approvalStatus === 0 && !approvalLoading;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      {/* Header with range buttons */}
      <div className="rounded-2xl border bg-white/70 dark:bg-neutral-900/40 backdrop-blur-sm">
        <div className="p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid place-items-center h-11 w-11 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
                Time Sheet
              </h1>
            </div>
          </div>

          <div className="shrink-0">
            <div className="inline-flex rounded-lg border bg-white dark:bg-neutral-900 p-1">
              {rangeButtons.map((btn) => {
                const active = windowDays === btn.value && !customMeta && !anchorISO;
                return (
                  <button
                    key={btn.value}
                    onClick={() => selectPreset(btn.value)}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition",
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    )}
                    aria-pressed={active}
                  >
                    {btn.label}
                  </button>
                );
              })}

              {isAdmin && (
                <button
                  onClick={() => setShowCustom((s) => !s)}
                  className={cn(
                    "ml-1 px-3 py-2 rounded-md text-sm font-medium transition inline-flex items-center gap-1",
                    showCustom
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  )}
                  title="Fetch data for a custom date range"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Custom
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom range panel — Admin only */}
        {isAdmin && showCustom && (
          <div className="px-5 pb-5 sm:px-6">
            <div className="rounded-lg border bg-white dark:bg-neutral-900 p-3 flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 px-2 py-1.5 rounded-md border text-sm bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 px-2 py-1.5 rounded-md border text-sm bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={fetchCustomRange}
                  disabled={loadingCustom}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition",
                    "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm inline-flex items-center gap-2"
                  )}
                >
                  {loadingCustom && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load
                </button>
                <button
                  onClick={() => {
                    const end = startOfDayInTZ(new Date(), TZ);
                    const start = addDays(end, -30);
                    setFromDate(ymd(start));
                    setToDate(ymd(end));
                  }}
                  className="px-3 py-2 rounded-md text-sm font-medium transition border bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                >
                  Reset dates
                </button>
              </div>
              {customError && <div className="text-rose-600 text-sm sm:ml-auto">{customError}</div>}
            </div>
          </div>
        )}

        {/* Sparkline */}
        <div className="px-5 pb-5 sm:px-6">
          <div className="rounded-lg border bg-white dark:bg-neutral-900 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <TrendingUp className="h-4 w-4" /> Activity trend
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Scale: 0–8h</div>
            </div>
            <svg
              viewBox="0 0 240 48"
              className="w-full h-12 mt-2 text-indigo-500 dark:text-indigo-400"
              suppressHydrationWarning
            >
              {hasData && <path d={buildSparkPath(sparkPoints)} fill="none" stroke="currentColor" strokeWidth="2" />}
            </svg>
          </div>
        </div>
      </div>

      {/* Calendar header with filters on the right */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
          <TrendingUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          <span className="whitespace-pre leading-tight">{headerRangeText}</span>
        </div>

        <div className="flex items-center gap-4 pb-6">
          {/* Project filter */}
          <label className="text-xxs font-bold text-neutral-600 dark:text-neutral-300">Project Filter</label>
          <select
            className="text-sm border rounded-md px-2 py-1 bg-white dark:bg-neutral-900 dark:border-neutral-700"
            value={String(selectedProject)}
            onChange={(e) => {
              const val = e.target.value === "all" ? "all" : Number(e.target.value);
              setSelectedProject(val);
            }}
            aria-label="Filter by project"
          >
            {projectOptions.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Developer filter (only for non-Developers) */}
          {!isDeveloper && !isFreelancerViewer && (
            <>
              <label className="text-xxs font-bold text-neutral-600 dark:text-neutral-300 ml-2">User Filter</label>
              <select
                className="text-sm border rounded-md px-2 py-1 bg-white dark:bg-neutral-900 dark:border-neutral-700"
                value={String(selectedDeveloper)}
                onChange={(e) => {
                  const val = e.target.value === "all" ? "all" : Number(e.target.value);
                  setSelectedDeveloper(val);
                }}
                aria-label="Filter by user"
              >
                {developerOptions.map((d) => (
                  <option key={String(d.id)} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* ===== FREELANCER APPROVAL TOAST + BUTTON ===== */}
      {effectiveDeveloper !== "all" && selectedRole === "freelancer" && (
        <div className="space-y-2">
          {/* Green toast/information bar */}
          <div
            className={cn(
              "rounded-xl px-4 py-3 border",
              "border-emerald-300 bg-emerald-50 text-emerald-900"
            )}
            role="status"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {approvalStatus === 1
                ? "This user's timesheet is approved till now."
                : "It's a freelancer — you have to approve this user's time sheet."}
            </div>
            {approvalError && (
              <div className="mt-1 flex items-center gap-2 text-rose-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{approvalError}</span>
              </div>
            )}
          </div>

          {/* Approve button only if not approved yet */}
          {approvalStatus === 0 && !approvalLoading && (
            <div className="flex">
              <button
                onClick={approveNow}
                disabled={approvalLoading}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition",
                  "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm inline-flex items-center gap-2"
                )}
              >
                {approvalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve Time Sheet
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== Cards section with CONDITIONAL pager (Admin + custom > 31 days) ===== */}
      <div className="flex items-center justify-between mb-2">
        <div />
        {showCardPager && (
          <div className="inline-flex items-center gap-2">
            <button
              onClick={pagePrev}
              disabled={pageIndex >= pageCount - 1}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-sm transition",
                pageIndex < pageCount - 1
                  ? "bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  : "opacity-50 cursor-not-allowed bg-white dark:bg-neutral-900"
              )}
              title="Older"
            >
              <ChevronLeft className="h-4 w-4" />
              Older
            </button>
            <div className="text-xs text-neutral-600 dark:text-neutral-300">
              Page {pageIndex + 1} of {pageCount}
            </div>
            <button
              onClick={pageNext}
              disabled={pageIndex <= 0}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-sm transition",
                pageIndex > 0
                  ? "bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  : "opacity-50 cursor-not-allowed bg-white dark:bg-neutral-900"
              )}
              title="Newer"
            >
              Newer
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Calendar tiles */}
      <div>
        {!hasData ? (
          <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" /> No days to display.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {windowSeries.map((item, idx) => {
              const hasHours = typeof item.hours === "number";
              const dateKey = keyOf(item.date);
              const all = localDetails?.[dateKey] || [];

              const byProject =
                selectedProject === "all"
                  ? all
                  : all.filter((r) => Number(r.project_id) === Number(selectedProject));
              const daySessions =
                effectiveDeveloper === "all"
                  ? byProject
                  : byProject.filter((r) => Number(r.developer_id) === Number(effectiveDeveloper));
              const hasSessions = daySessions.length > 0;

              return (
                <div
                  key={`${format(item.date, "yyyy-MM-dd", { locale: enUS })}-${idx}`}
                  className={cn(
                    "relative rounded-lg p-3 text-center transition-colors",
                    "h-32",
                    getBoxChrome(item.hours)
                  )}
                >
                  <button
                    type="button"
                    onClick={() => hasSessions && handleEditIconClick(item)}
                    disabled={checkingBusy || !hasSessions}
                    aria-busy={checkingBusy}
                    className={cn(
                      "absolute right-1.5 top-1.5 inline-flex items-center justify-center h-7 w-7 rounded-md border border-neutral-200 bg-white/80 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:bg-neutral-700",
                      (!hasSessions || checkingBusy) && "opacity-0 pointer-events-none"
                    )}
                    aria-label={`View details for ${dateKey}`}
                    title={checkingBusy ? "Checking..." : hasSessions ? "View / edit day" : "No sessions"}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <div className="flex h-full flex-col items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        {format(item.date, "EEE", { locale: enUS })}
                      </div>
                      <div className="text-xl font-semibold leading-none text-neutral-900 dark:text-neutral-100">
                        {format(item.date, "d", { locale: enUS })}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {format(item.date, "MMM yyyy", { locale: enUS })}
                      </div>
                    </div>

                    {item.label ? (
                      <div className={cn("inline-flex items-center gap-1 text-sm font-semibold", getHourTextTone(item.hours))}>
                        <Clock className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                    ) : hasHours ? (
                      <div className={cn("inline-flex items-center gap-1 text-xl font-semibold", getHourTextTone(item.hours))}>
                        <Clock className="h-4.5 w-4.5" />
                        <span>{item.hours}h</span>
                      </div>
                    ) : (
                      <div className="h-6" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {details && (
        <TimeSheetEditModal
          details={details}
          tzLabel={TZ}
          onClose={closeDetails}
          onUpdateItemTime={updateItemTime}
          onReasonChange={onReasonChange}
          onSubmitChanges={onSubmitChanges}
        />
      )}
    </div>
  );
}
