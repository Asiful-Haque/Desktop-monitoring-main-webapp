"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Clock,
  TrendingUp,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import TimeSheetEditModal from "../TimeSheetEditModal";

/* utils */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
function normalizeAndSort(src) {
  const normalized = (src ?? []).map((d) => ({
    date: d.date instanceof Date ? d.date : new Date(d.date),
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
function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  const diff = Math.ceil((+b - +a) / (24 * 3600 * 1000)) + 1;
  return Math.max(0, diff);
}

/** ---------- fixed window ending today in Asia/Dhaka ---------- */
const TZ = "Asia/Dhaka";
function todayInTZ(timeZone = TZ) {
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
function buildFixedWindowSeries(windowDays, timeZone = TZ) {
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
/** ---------------------------------------------------------------- */

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

/* filtered recompute */
function secondsToLabel(totalSec) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(
    2,
    "0"
  )}s`;
}
function roundHours2(sec) {
  return Math.round((sec / 3600) * 100) / 100;
}
function sumSecondsFor(filters, rows) {
  const { projectId, userId } = filters;
  let target = rows;
  if (projectId !== "all")
    target = target.filter((r) => r.project_id === projectId);
  if (userId !== "all") target = target.filter((r) => r.user_id === userId);
  return target.reduce((sum, r) => sum + (r.seconds || 0), 0);
}
function buildFilteredSeries(baseSeries, detailsByDate, projectId, userId) {
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

/* Time helpers (must match server aggregation TZ) */
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
  const ymd = `${objD.year}-${objD.month}-${objD.day}`;
  const [HH, MM, SS] = hms.split(":").map((x) => parseInt(x || "0", 10));
  const local = new Date(
    `${ymd}T${String(HH).padStart(2, "0")}:${String(MM).padStart(
      2,
      "0"
    )}:${String(SS).padStart(2, "0")}`
  );
  return local.toISOString();
}
function diffSecondsISO(startISO, endISO) {
  if (!startISO || !endISO) return 0;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  return Math.max(0, Math.floor((b - a) / 1000));
}

/* Admin custom helpers */
function parseISO2(v) {
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
function computeSecondsFromRow(row) {
  const start = parseISO2(row?.task_start);
  const end = parseISO2(row?.task_end);
  if (start && end && end > start) {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }
  const d = row?.duration;
  if (typeof d === "number" && !Number.isNaN(d)) {
    if (d >= 3600000) return Math.floor(d / 1000); // ms
    if (d >= 3600) return Math.floor(d); // seconds
    if (d >= 60) return Math.floor(d * 60); // minutes
    return Math.floor(d * 60);
  }
  return 0;
}

export default function TimeSheet({
  initialWindow,
  data,
  detailsByDate,
  userRole = "Developer",
  userId,
  userRolesById, // { [userId]: "Developer" | "Freelancer" | ... }
  apiUrl,
  currentUser,
}) {
  const router = useRouter();
  const isAdmin = String(userRole).toLowerCase() === "admin";

  // Range selection (buttons row). "custom" is admin-only.
  const [rangeMode, setRangeMode] = useState("preset"); // 'preset' | 'custom'
  const [windowDays, setWindowDays] = useState(
    [7, 15, 31].includes(initialWindow) ? initialWindow : 7
  );

  // Custom date inputs (admin)
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Pagination for custom > 31
  const PAGE_SIZE = 31;
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => setPageIndex(0), [rangeMode, customStart, customEnd]);

  // Local copies so custom fetch can replace data
  const [localDetailsByDate, setLocalDetailsByDate] = useState(
    detailsByDate || {}
  );
  const [localData, setLocalData] = useState(data || []);
  useEffect(() => {
    if (data?.length) setLocalData(normalizeAndSort(data));
    if (detailsByDate) setLocalDetailsByDate(detailsByDate);
  }, [data, detailsByDate]);

  // Role helpers
  const getRoleForUser = (id) => {
    return (userRolesById?.[id] ?? userRolesById?.[String(id)]) || undefined;
  };
  const formatRole = (r) =>
    r ? r.charAt(0).toUpperCase() + r.slice(1).toLowerCase() : "User";

  // Filters
  const projectOptions = useMemo(() => {
    const map = new Map();
    if (localDetailsByDate) {
      for (const arr of Object.values(localDetailsByDate)) {
        for (const r of arr) {
          if (Number.isFinite(r.project_id))
            map.set(r.project_id, r.project_name || `Project ${r.project_id}`);
        }
      }
    }
    return [
      { id: "all", name: "All projects" },
      ...Array.from(map, ([id, name]) => ({ id, name })),
    ];
  }, [localDetailsByDate]);

  const userOptions = useMemo(() => {
    const nameMap = new Map();
    if (localDetailsByDate) {
      for (const arr of Object.values(localDetailsByDate)) {
        for (const r of arr) {
          if (r.user_id != null)
            nameMap.set(r.user_id, r.user_name || `User ${r.user_id}`);
        }
      }
    }
    const opts = Array.from(nameMap, ([id, baseName]) => {
      const role = formatRole(getRoleForUser(id));
      const label = `${baseName} (${role})`;
      return { id, name: label, rawName: baseName, role };
    });
    return [{ id: "all", name: "All users", role: undefined }, ...opts];
  }, [localDetailsByDate, userRolesById]);

  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  useEffect(() => {
    const ids = new Set(projectOptions.map((p) => p.id));
    if (!ids.has(selectedProject)) setSelectedProject("all");
  }, [projectOptions, selectedProject]);
  useEffect(() => {
    const ids = new Set(userOptions.map((u) => u.id));
    if (!ids.has(selectedUser)) setSelectedUser("all");
  }, [userOptions, selectedUser]);

  // Base series
  const clientData = useMemo(() => normalizeAndSort(localData), [localData]);

  // PRESET: always show fixed window ending today
  const baseSeriesPreset = useMemo(
    () => buildFixedWindowSeries(windowDays, TZ),
    [windowDays]
  );

  // CUSTOM: span of loaded data
  const baseSeriesCustom = useMemo(() => {
    if (rangeMode !== "custom" || !clientData.length) return [];
    const first = clientData[0]?.date;
    const last = clientData[clientData.length - 1]?.date;
    if (!first || !last) return [];
    const map = new Map(
      clientData.map((r) => [keyOf(r.date), { hours: r.hours, label: r.label }])
    );
    const totalDays = daysBetween(keyOf(first), keyOf(last));
    const start = new Date(first);
    const series = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = keyOf(d);
      const v = map.get(k) || {};
      series.push({ date: d, hours: v.hours, label: v.label });
    }
    return series;
  }, [rangeMode, clientData]);

  const baseSeries =
    rangeMode === "custom" ? baseSeriesCustom : baseSeriesPreset;

  // Apply filters
  const filteredSeries = useMemo(
    () =>
      buildFilteredSeries(
        baseSeries,
        localDetailsByDate,
        selectedProject,
        selectedUser
      ),
    [baseSeries, localDetailsByDate, selectedProject, selectedUser]
  );

  // Pagination when custom > 31
  const needsPaging =
    rangeMode === "custom" && filteredSeries.length > PAGE_SIZE;
  const totalPages = needsPaging
    ? Math.ceil(filteredSeries.length / PAGE_SIZE)
    : 1;
  const pageStart = needsPaging ? pageIndex * PAGE_SIZE : 0;
  const pageEnd = needsPaging ? pageStart + PAGE_SIZE : filteredSeries.length;
  const windowSeries = filteredSeries.slice(pageStart, pageEnd);

  const hasData = windowSeries.length > 0;
  const daysWithHours = useMemo(
    () => windowSeries.filter((d) => typeof d.hours === "number"),
    [windowSeries]
  );
  const totalHours = daysWithHours.reduce((sum, d) => sum + (d.hours ?? 0), 0);
  const avg = daysWithHours.length
    ? (totalHours / daysWithHours.length).toFixed(1)
    : "0";

  // Admin custom loader
  async function loadCustomRange() {
    if (!apiUrl) return alert("Missing apiUrl");
    if (!customStart || !customEnd)
      return alert("Please select both start and end dates.");
    const body = {
      startDate: customStart,
      endDate: customEnd,
      all: true,
      userId: currentUser?.id ?? userId,
      userRole,
    };
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (!res.ok) {
        const x = await res.json().catch(() => ({}));
        throw new Error(x?.error || `Fetch failed ${res.status}`);
      }
      const payload = await res.json();
      const rows = Array.isArray(payload?.items) ? payload.items : [];

      const daySessions = new Map();
      for (const row of rows) {
        const startDt = parseISO2(row?.task_start);
        const endDt = parseISO2(row?.task_end);
        const anchor = startDt || endDt || parseISO2(row?.work_date);
        if (!anchor) continue;

        const dayKey = keyInTZ(anchor, TZ);
        const secs = computeSecondsFromRow(row);

        const item = {
          serial_id: row?.serial_id ?? null,
          seconds: secs,
          startISO: startDt ? startDt.toISOString() : null,
          endISO: endDt ? endDt.toISOString() : null,
          line: "",
          task_id: row?.task_id ?? null,
          project_id: row?.project_id ?? null,
          project_name: row?.project_name ?? null,
          task_name: row?.task_name ?? null,
          user_id:
            row?.user_id ?? row?.dev_user_id ?? row?.developer_id ?? null,
          user_name: row?.user_name ?? row?.developer_name ?? null,
          user_role:
            String(row?.role ?? row?.developer_role ?? "")
              .trim()
              .toLowerCase() || null,
          flagger:
            typeof row?.flagger === "number"
              ? row.flagger
              : Number(row?.flagger ?? 0),
        };

        const list = daySessions.get(dayKey) || [];
        list.push(item);
        daySessions.set(dayKey, list);
      }

      const newDetails = {};
      const newData = Array.from(daySessions.entries())
        .map(([date, sessions]) => {
          newDetails[date] = sessions;
          const totalSecs = sessions.reduce(
            (acc, s) => acc + (s.seconds || 0),
            0
          );
          const hours = Math.round((totalSecs / 3600) * 100) / 100;
          return { date, hours, label: secondsToLabel(totalSecs) };
        })
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

      setLocalDetailsByDate(newDetails);
      setLocalData(newData);
      setRangeMode("custom");
      setPageIndex(0);
    } catch (e) {
      console.error("Custom range fetch failed:", e);
      alert(e?.message || "Failed to load custom range.");
    }
  }

  /** Busy check UX lock */
  const [checkingBusy, setCheckingBusy] = useState(false);
  async function handleEditIconClick(day) {
    if (checkingBusy) return;
    try {
      setCheckingBusy(true);
      const dateKey = keyOf(day.date);
      const srcItemsAll = localDetailsByDate?.[dateKey] || [];
      const srcItems = srcItemsAll.filter((it) => {
        const pOK =
          selectedProject === "all" || it.project_id === selectedProject;
        const uOK = selectedUser === "all" || it.user_id === selectedUser;
        return pOK && uOK;
      });

      const taskIdOfSerialIds = srcItems
        .map((it) => it.task_id)
        .filter((x) => Number.isFinite(x));
      const res = await fetch("/api/tasks/busy-or-not", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIdOfSerialIds }),
      });
      const { any_busy, busy_serials } = await res.json();
      if (!res.ok) throw new Error("Busy check failed");

      if (any_busy) {
        alert(
          busy_serials?.length
            ? `Some task(s) are currently running (serial: ${busy_serials.join(
                ", "
              )}). Please stop them first.`
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

  /* Day Details (modal) */
  const [details, setDetails] = useState(null);
  function openDetails(day) {
    const dateKey = keyOf(day.date);
    const srcItemsAll = localDetailsByDate?.[dateKey] || [];
    const filtered = srcItemsAll.filter((it) => {
      const pOK =
        selectedProject === "all" || it.project_id === selectedProject;
      const uOK = selectedUser === "all" || it.user_id === selectedUser;
      return pOK && uOK;
    });
    const totalLabel =
      secondsToLabel(filtered.reduce((s, r) => s + (r.seconds || 0), 0)) || "";
    const items = filtered.map((it) => {
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
      .filter(
        (it) => it.newStartISO !== it.startISO || it.newEndISO !== it.endISO
      )
      .map((it) => ({
        serial_id: it.serial_id,
        project_id: it.project_id,
        task_id: it.task_id,
        user_id: it.user_id,
        old: { startISO: it.startISO, endISO: it.endISO, seconds: it.seconds },
        new: {
          startISO: it.newStartISO,
          endISO: it.newEndISO,
          seconds: it.newSeconds,
        },
      }));
    const payload = {
      dateKey: details.dateKey,
      reason: details.reason.trim(),
      timezone: TZ,
      filters: { projectId: selectedProject, userId: selectedUser },
      changes,
    };
    console.log("Submit TimeSheet Changes payload:", payload);
    alert("Payload logged in console. Wire this to your update API.");
    closeDetails();
  }

  /* ----------------- Freelancer approval (self) ----------------- */
  const [approval, setApproval] = useState(null); // 0 / 1 / 2 / null
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalErr, setApprovalErr] = useState(null);

  const targetUserId = currentUser?.id ?? userId;

  async function fetchApprovalSelf() {
    try {
      setApprovalLoading(true);
      setApprovalErr(null);
      const res = await fetch("/api/users/Time-sheet-approval/getLatestValue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: targetUserId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to fetch approval");
      const v = Number(j?.time_sheet_approval);
      setApproval(Number.isFinite(v) ? v : null);
    } catch (e) {
      setApprovalErr(e?.message || "Failed to fetch approval");
    } finally {
      setApprovalLoading(false);
    }
  }

  useEffect(() => {
    if (
      targetUserId != null &&
      String(userRole).toLowerCase() === "freelancer"
    ) {
      fetchApprovalSelf();
    }
  }, [targetUserId, userRole]);

  async function handleApproveForPayment() {
    try {
      setApprovalLoading(true);
      const res = await fetch("/api/users/Time-sheet-approval/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: targetUserId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to update");
      const v = Number(j?.time_sheet_approval);
      setApproval(Number.isFinite(v) ? v : 1);
    } catch (e) {
      alert(e?.message || "Could not set approval");
    } finally {
      setApprovalLoading(false);
    }
  }

  const approvalStatusText = approvalLoading
    ? "Please wait…"
    : approval === 1
    ? "Already sent for payment"
    : approval === 2
    ? "It’s rejected — send again"
    : "Send your timesheet for payment"; // covers 0 and null

  /* ----------------- Admin: Approve/Reject selected freelancer ----------------- */
  const [adminSelApproval, setAdminSelApproval] = useState(null);
  const [adminSelLoading, setAdminSelLoading] = useState(false);
  const [adminSelErr, setAdminSelErr] = useState(null);

  const selectedUserIsSpecific =
    isAdmin && selectedUser !== "all" && typeof selectedUser === "number";

  const selectedUserRole = useMemo(() => {
    if (!selectedUserIsSpecific) return undefined;
    return (getRoleForUser(selectedUser) || "").toLowerCase();
  }, [selectedUserIsSpecific, selectedUser, userRolesById]);

  const isSelectedFreelancer =
    selectedUserIsSpecific && selectedUserRole === "freelancer";

  async function fetchApprovalForSelectedUser(uid) {
    try {
      setAdminSelLoading(true);
      setAdminSelErr(null);
      const res = await fetch("/api/users/Time-sheet-approval/getLatestValue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to fetch approval");
      const v = Number(j?.time_sheet_approval);
      setAdminSelApproval(Number.isFinite(v) ? v : null);
    } catch (e) {
      setAdminSelErr(e?.message || "Failed to fetch approval");
      setAdminSelApproval(null);
    } finally {
      setAdminSelLoading(false);
    }
  }

  useEffect(() => {
    if (isSelectedFreelancer) {
      fetchApprovalForSelectedUser(selectedUser);
    } else {
      setAdminSelApproval(null);
      setAdminSelErr(null);
      setAdminSelLoading(false);
    }
  }, [isSelectedFreelancer, selectedUser]);

  async function handleAdminApproveSelected() { //----------------Thats the crucial part----------------
    if (!isSelectedFreelancer) return;
    try {
      // setAdminSelLoading(true);
      // const res = await fetch("/api/users/Time-sheet-approval/approve", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ user_id: selectedUser }),
      // });
      // const j = await res.json();
      // if (!res.ok) throw new Error(j?.message || "Failed to approve");
      // const v = Number(j?.time_sheet_approval);
      // setAdminSelApproval(Number.isFinite(v) ? v : 0); // approved -> 0
      console.log("Admin approve action for user id:", selectedUser);
    } catch (e) {
      alert(e?.message || "Could not approve timesheet");
    } finally {
      setAdminSelLoading(false);
    }
  }

  async function handleAdminRejectSelected() {
    if (!isSelectedFreelancer) return;
    try {
      setAdminSelLoading(true);
      const res = await fetch("/api/users/Time-sheet-approval/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to reject");
      const v = Number(j?.time_sheet_approval);
      setAdminSelApproval(Number.isFinite(v) ? v : 2); // rejected -> 2
    } catch (e) {
      alert(e?.message || "Could not reject timesheet");
    } finally {
      setAdminSelLoading(false);
    }
  }

  // Buttons enabled only when value === 1 (sent). Disabled if 0 or 2 (or while loading).
  const adminActionDisabled = adminSelLoading || adminSelApproval !== 1;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
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

          {/* Range buttons + Custom inline (admin) */}
          <div className="shrink-0 flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-lg border bg-white dark:bg-neutral-900 p-1">
              {[
                { label: "Weekly", value: 7 },
                { label: "15 Days", value: 15 },
                { label: "Monthly", value: 31 },
                ...(isAdmin ? [{ label: "Custom", value: "custom" }] : []),
              ].map((btn) => {
                const isCustomBtn = btn.value === "custom";
                const active =
                  (rangeMode === "preset" && windowDays === btn.value) ||
                  (rangeMode === "custom" && isCustomBtn);
                return (
                  <button
                    key={String(btn.value)}
                    onClick={() => {
                      if (isCustomBtn) {
                        setRangeMode("custom");
                      } else {
                        setRangeMode("preset");
                        setWindowDays(btn.value);
                      }
                    }}
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
            </div>

            {/* Inline custom inputs (visible only when Custom active) */}
            {isAdmin && rangeMode === "custom" && (
              <div className="flex items-end gap-2">
                <div className="flex flex-col">
                  <label className="text-xxs font-bold text-neutral-600 dark:text-neutral-300">
                    Start
                  </label>
                  <input
                    type="date"
                    className="text-sm border rounded-md px-2 py-1 bg-white dark:bg-neutral-900 dark:border-neutral-700"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xxs font-bold text-neutral-600 dark:text-neutral-300">
                    End
                  </label>
                  <input
                    type="date"
                    className="text-sm border rounded-md px-2 py-1 bg-white dark:bg-neutral-900 dark:border-neutral-700"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
                <button
                  onClick={loadCustomRange}
                  className="h-[38px] px-3 py-2 rounded-md text-sm font-medium transition bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  Load
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div className="px-5 pb-5 sm:px-6">
          <div className="rounded-lg border bg-white dark:bg-neutral-900 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <TrendingUp className="h-4 w-4" /> Activity trend
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Scale: 0–8h
              </div>
            </div>
            <svg
              viewBox="0 0 240 48"
              className="w-full h-12 mt-2 text-indigo-500 dark:text-indigo-400"
              suppressHydrationWarning
            >
              {windowSeries.length > 0 && (
                <path
                  d={buildSparkPath(
                    windowSeries.map((d) =>
                      typeof d.hours === "number" ? d.hours : 0
                    )
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
          <TrendingUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          {rangeMode === "custom" ? "Custom Range" : `Last ${windowDays} Days`}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xxs font-bold text-neutral-600 dark:text-neutral-300">
              Project
            </label>
            <select
              className="text-sm border rounded-md px-2 py-1 bg-white dark:bg-neutral-900 dark:border-neutral-700"
              value={String(selectedProject)}
              onChange={(e) =>
                setSelectedProject(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              aria-label="Filter by project"
            >
              {projectOptions.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <label className="text-xxs font-bold text-neutral-600 dark:text-neutral-300">
                User
              </label>
              <select
                className="text-sm border rounded-md px-2 py-1 bg-white dark:bg-neutral-900 dark:border-neutral-700"
                value={String(selectedUser)}
                onChange={(e) =>
                  setSelectedUser(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
                aria-label="Filter by user"
              >
                {userOptions.map((u) => (
                  <option key={String(u.id)} value={String(u.id)}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Freelancer self — Approve For Payment */}
      {String(userRole).toLowerCase() === "freelancer" && (
        <>
          <div className="flex items-center justify-start">
            <button
              onClick={handleApproveForPayment}
              disabled={approvalLoading || approval === 1}
              title={approvalStatusText}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition shadow-sm",
                approval === 1 || approvalLoading
                  ? "bg-neutral-300 text-neutral-600 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-300"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              )}
            >
              {approvalLoading
                ? "Processing…"
                : approval === 1
                ? "Already sent for payment"
                : approval === 2
                ? "It’s rejected — send again"
                : "Send your timesheet for payment"}
            </button>
          </div>
          {approvalErr && (
            <div className="text-left text-xs text-rose-600 dark:text-rose-400 mt-1">
              {approvalErr}
            </div>
          )}
        </>
      )}

      {/* ADMIN banner for selected freelancer */}
      {isAdmin && isSelectedFreelancer && (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            You need to approve this timesheet
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdminApproveSelected}
              disabled={adminActionDisabled}
              title={
                adminSelLoading
                  ? "Please wait…"
                  : adminSelApproval === 1
                  ? "Approve timesheet"
                  : "Awaiting freelancer to send / already handled"
              }
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition shadow-sm",
                adminActionDisabled
                  ? "bg-neutral-300 text-neutral-600 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-300"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              )}
            >
              {adminSelLoading ? "Processing…" : "Approve Timesheet"}
            </button>

            <button
              onClick={handleAdminRejectSelected}
              disabled={adminSelLoading || adminSelApproval !== 1}
              title={
                adminSelLoading
                  ? "Please wait…"
                  : adminSelApproval === 1
                  ? "Reject timesheet"
                  : "Awaiting freelancer to send / already handled"
              }
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition shadow-sm",
                adminSelLoading || adminSelApproval !== 1
                  ? "bg-neutral-300 text-neutral-600 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-300"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              )}
            >
              {adminSelLoading ? "Processing…" : "Reject Timesheet"}
            </button>

            {adminSelErr && (
              <span className="text-xs text-rose-600 dark:text-rose-400">
                {adminSelErr}
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-500">
            {adminSelApproval === 1
              ? "Freelancer has sent their timesheet. You can approve or reject now."
              : adminSelApproval === 0
              ? "Timesheet not yet sent."
              : adminSelApproval === 2
              ? "Timesheet was rejected."
              : "Approval status unknown."}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            title: "Total Hours (filled days)",
            value: `${totalHours.toFixed(2)}h`,
            sub: "Sum for selected filters",
          },
          {
            title: "Days Shown",
            value: `${windowSeries.length}`,
            sub:
              rangeMode === "custom" && needsPaging
                ? `Page ${pageIndex + 1}/${totalPages}`
                : "Window length",
          },
          {
            title: "Avg Hours/Day (filled)",
            value: `${avg}h`,
            sub: "Mean for selected filters",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border bg-white dark:bg-neutral-900 p-4 h-28"
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-indigo-600/80 dark:bg-indigo-400/80" />
            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {card.title}
            </div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {card.value}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination (only when custom and > 31 days) */}
      {rangeMode === "custom" && needsPaging && (
        <div className="flex items-center justify-end gap-2">
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            Page {pageIndex + 1} of {totalPages}
          </span>
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            disabled={pageIndex >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Day tiles */}
      <div>
        {!hasData ? (
          <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" /> No days to
            display.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {windowSeries.map((item, idx) => {
              const hasHours = typeof item.hours === "number";
              const dateKey = keyOf(item.date);
              const dayAll = localDetailsByDate?.[dateKey] || [];
              const daySessions = dayAll.filter((r) => {
                const pOK =
                  selectedProject === "all" || r.project_id === selectedProject;
                const uOK =
                  selectedUser === "all" || r.user_id === selectedUser;
                return pOK && uOK;
              });
              const hasSessions = daySessions.length > 0;

              return (
                <div
                  key={`${format(item.date, "yyyy-MM-dd", {
                    locale: enUS,
                  })}-${idx}`}
                  className={cn(
                    "relative rounded-lg p-3 text-center transition-colors h-36 flex flex-col justify-between",
                    getBoxChrome(item.hours)
                  )}
                >
                  {hasSessions && (
                    <button
                      type="button"
                      onClick={() => handleEditIconClick(item)}
                      disabled={checkingBusy}
                      aria-busy={checkingBusy}
                      className={cn(
                        "absolute right-1.5 top-1.5 inline-flex items-center justify-center h-7 w-7 rounded-md border border-neutral-200 bg-white/80 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:bg-neutral-700",
                        checkingBusy && "opacity-60 pointer-events-none"
                      )}
                      aria-label={`View details for ${dateKey}`}
                      title={checkingBusy ? "Checking..." : "View / edit day"}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}

                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      {format(item.date, "EEE", { locale: enUS })}
                    </div>
                    <div className="text-xl font-semibold leading-none text-neutral-900 dark:text-neutral-100">
                      {format(item.date, "d", { locale: enUS })}
                    </div>
                    <div className="text-[11px] mb-2 text-neutral-500 dark:text-neutral-400">
                      {format(item.date, "MMM yyyy", { locale: enUS })}
                    </div>
                  </div>

                  <div className="min-h-[1.25rem]">
                    {item.label ? (
                      <div className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        <Clock className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                    ) : hasHours ? (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 text-xl font-semibold",
                          getHourTextTone(item.hours)
                        )}
                      >
                        <Clock className="h-4 w-4" />
                        <span>{item.hours}h</span>
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-400 dark:text-neutral-500">
                        —
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
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
