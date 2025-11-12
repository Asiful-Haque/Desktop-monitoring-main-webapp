// src/components/TimeSheet/TimeSheet.js
"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Clock,
  TrendingUp,
  Pencil,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import TimeSheetEditModal from "../TimeSheetEditModal";
import {
  submitAllVisiblePayments,
  submitSinglePayment,
} from "@/app/lib/PaymentCommonApi";
import {
  groupCurrentMonthForPayment,
  cn,
  normalizeAndSort,
  keyOf,
  daysBetween,
  TZ,
  CURRENT_TZ,
  todayInTZ,
  buildFixedWindowSeries,
  buildSparkPath,
  getHourRangeTone,
  getCardBackground,
  getCardRibbon,
  getCardBorder,
  getBadgeClasses,
  getRangeLabel,
  progressPercent,
  secondsToLabel,
  roundHours2,
  buildFilteredSeries,
  isoToLocalHMS,
  combineDateWithHMS,
  diffSecondsISO,
  parseISO2,
  keyInTZ,
  computeSecondsFromRow,
  buildDailyPayablesForUser,
  hasAnyFlaggerZeroForUser,
  currentMonthKey,
  bucketForDay,
} from "@/app/lib/timesheet-utils";

/* ----------------- Component ----------------- */
export default function TimeSheet({
  initialWindow,
  data, // month-mixed array (now includes session_seconds)
  detailsByDate,
  userRole = "Developer",
  userId,
  userRolesById,
  apiUrl,
  currentUser,
}) {
  const router = useRouter();
  const isAdmin = String(userRole).toLowerCase() === "admin";

  // Range selection
  const [rangeMode, setRangeMode] = useState("preset");
  const [windowDays, setWindowDays] = useState(
    [7, 15, 31].includes(initialWindow) ? initialWindow : 7
  );

  // Custom date inputs (admin)
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Paging
  const PAGE_SIZE = 31;
  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => setPageIndex(0), [rangeMode, customStart, customEnd]);

  // Local copies
  const [localDetailsByDate, setLocalDetailsByDate] = useState(
    detailsByDate || {}
  );
  const [localData, setLocalData] = useState(data || []);
  useEffect(() => {
    if (data?.length) setLocalData(normalizeAndSort(data));
    if (detailsByDate) setLocalDetailsByDate(detailsByDate);
  }, [data, detailsByDate]);

  // Admin payment scratch
  const [payProcessedMap, setPayProcessedMap] = useState({});
  const [payRows, setPayRows] = useState([]);

  // Gating
  const [mounted, setMounted] = useState(false);
  const [approvalFetched, setApprovalFetched] = useState(false);
  useEffect(() => setMounted(true), []);

  // Role helpers
  const getRoleForUser = (id) =>
    (userRolesById?.[id] ?? userRolesById?.[String(id)]) || undefined;
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

  const selectedUserName = useMemo(() => {
    const match = userOptions.find((u) => u.id === selectedUser);
    return match?.rawName || match?.name || String(selectedUser);
  }, [userOptions, selectedUser]);

  const clientData = useMemo(() => normalizeAndSort(localData), [localData]);

  useEffect(() => {
    if (selectedUser !== "all" && localDetailsByDate) {
      const selectedUserSessions = Object.values(localDetailsByDate)
        .flat()
        .filter(
          (session) => session.user_id === selectedUser && session.flagger === 0
        );
      const groupedByDate = {};
      selectedUserSessions.forEach((session) => {
        const date = format(new Date(session.startISO), "yyyy-MM-dd");
        const hours = (session.seconds / 3600).toFixed(2);
        if (!groupedByDate[date]) {
          groupedByDate[date] = { date, hours: 0, label: "", serial_ids: [] };
        }
        groupedByDate[date].hours += parseFloat(hours);
        groupedByDate[date].serial_ids.push(session.serial_id);
        groupedByDate[date].label = `${groupedByDate[date].hours}h`;
      });
      const groupedSessions = Object.values(groupedByDate);
      console.log("Grouped Sessions (flagger = 0):", groupedSessions);
    }
  }, [selectedUser, localDetailsByDate]);

  // PRESET window
  const baseSeriesPreset = useMemo(
    () => buildFixedWindowSeries(windowDays, TZ),
    [windowDays]
  );

  // CUSTOM window
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
  const filteredSeries = useMemo(() => {
    return buildFilteredSeries(
      baseSeries,
      localDetailsByDate,
      selectedProject,
      selectedUser
    );
  }, [baseSeries, localDetailsByDate, selectedProject, selectedUser]);

  // Paging
  const needsPaging = rangeMode === "custom" && filteredSeries.length > 31;
  const totalPages = needsPaging ? Math.ceil(filteredSeries.length / 31) : 1;
  const pageStart = needsPaging ? pageIndex * 31 : 0;
  const pageEnd = needsPaging ? pageStart + 31 : filteredSeries.length;
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
          session_payment: Number(row?.session_payment) || 0,
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
  const hasUnprocessedForSelf = useMemo(
    () => hasAnyFlaggerZeroForUser(localDetailsByDate, targetUserId),
    [localDetailsByDate, targetUserId]
  );

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
      setApprovalFetched(true);
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

  useEffect(() => {
    if (String(userRole).toLowerCase() !== "freelancer") {
      setApprovalFetched(true);
    }
  }, [userRole]);

  async function handleApproveForPayment() {
    if (!hasUnprocessedForSelf) {
      alert(
        "No unprocessed entries found in this range. Only days with entries marked flagger = 0 can be sent for payment."
      );
      return;
    }
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
    : !hasUnprocessedForSelf
    ? "No unprocessed entries (flagger = 0) to send"
    : approval === 2
    ? "It’s rejected — send again"
    : "Send your timesheet for payment";

  const uiReadyForSelf =
    mounted && approvalFetched && localDetailsByDate != null;

  const buttonLabel = !uiReadyForSelf
    ? "Loading…"
    : approvalLoading
    ? "Processing…"
    : approval === 1
    ? "Already sent for payment"
    : !hasUnprocessedForSelf
    ? "No unprocessed entries"
    : approval === 2
    ? "It’s rejected — send again"
    : "Send your timesheet for payment";

  const buttonDisabled =
    !uiReadyForSelf ||
    approvalLoading ||
    approval === 1 ||
    !hasUnprocessedForSelf;

  /* ----------------- Admin: Approve/Reject selected freelancer ----------------- */
  const [adminSelApproval, setAdminSelApproval] = useState(null);
  const [adminSelLoading, setAdminSelLoading] = useState(false);
  const [adminSelErr, setAdminSelErr] = useState(null);

  const isAdminSelectedUserNumeric =
    isAdmin && selectedUser !== "all" && typeof selectedUser === "number";

  const selectedUserRole = useMemo(() => {
    if (!isAdminSelectedUserNumeric) return undefined;
    return (getRoleForUser(selectedUser) || "").toLowerCase();
  }, [isAdminSelectedUserNumeric, selectedUser, userRolesById]);

  const isSelectedFreelancer =
    isAdminSelectedUserNumeric && selectedUserRole === "freelancer";

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

  const dailyPayablesForSelected = useMemo(() => {
    if (!isAdmin || !isAdminSelectedUserNumeric) return [];
    return buildDailyPayablesForUser(localDetailsByDate, selectedUser);
  }, [isAdmin, isAdminSelectedUserNumeric, localDetailsByDate, selectedUser]);

  useEffect(() => {
    if (!isAdmin || !isAdminSelectedUserNumeric) return;
    const tenant_id = currentUser?.tenant_id ?? "MISSING_TENANT";
    const admin_user_id = currentUser?.id ?? "MISSING_ADMIN_ID";
    try {
      console.groupCollapsed(
        "%cPAY DEBUG → selection",
        "background:#1f2937;color:#fff;padding:2px 6px;border-radius:4px;"
      );
      console.log("Selected freelancer:", {
        id: selectedUser,
        name: selectedUserName,
      });
      console.log("Tenant/Admin context:", { tenant_id, admin_user_id });
      if (
        tenant_id === "MISSING_TENANT" ||
        admin_user_id === "MISSING_ADMIN_ID"
      ) {
        console.warn("⚠️ currentUser.tenant_id or currentUser.id is missing.");
      }
      console.log("Daily payables:", dailyPayablesForSelected);
      console.log("Local details snapshot:", localDetailsByDate);
      console.groupEnd();
      if (typeof window !== "undefined") {
        window.__PAY_DEBUG__ = {
          ts: new Date().toISOString(),
          selectedUser: { id: selectedUser, name: selectedUserName },
          tenant_id,
          admin_user_id,
          dailyPayables: dailyPayablesForSelected,
          detailsByDate: localDetailsByDate,
        };
      }
    } catch (_) {}
  }, [
    isAdmin,
    isAdminSelectedUserNumeric,
    selectedUser,
    selectedUserName,
    dailyPayablesForSelected,
    localDetailsByDate,
    currentUser?.tenant_id,
    currentUser?.id,
  ]);

  async function handleAdminApproveSelected() {
    if (!isSelectedFreelancer) return;
    try {
      setAdminSelLoading(true);
      const res = await fetch("/api/users/Time-sheet-approval/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to approve");
      const v = Number(j?.time_sheet_approval);
      setAdminSelApproval(Number.isFinite(v) ? v : 0);

      const dailyPayables = dailyPayablesForSelected;
      if (!dailyPayables.length) {
        alert("No payable unprocessed days found for this user.");
        return;
      }
      const currentUserForTxn = {
        ...(currentUser || {}),
        id: currentUser?.id ?? selectedUser,
        tenant_id: currentUser?.tenant_id ?? "9999",
      };
      await submitAllVisiblePayments({
        currentRows: dailyPayables,
        processed: payProcessedMap,
        setProcessed: setPayProcessedMap,
        setRows: setPayRows,
        currentUser: currentUserForTxn,
        developerId: selectedUser,
      });
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
      setAdminSelApproval(Number.isFinite(v) ? v : 2);
    } catch (e) {
      alert(e?.message || "Could not reject timesheet");
    } finally {
      setAdminSelLoading(false);
    }
  }

  const adminActionDisabled = adminSelLoading || adminSelApproval !== 1;

  /* --------- Build the grouped payment data (current month) --------- */
  const groupedForPayment = useMemo(
    () => groupCurrentMonthForPayment(data),
    [data]
  );

  useEffect(() => {
    try {
      console.groupCollapsed(
        "%cCurrent Month Payment Buckets (by Developer)",
        "background:#4f46e5;color:#fff;padding:2px 6px;border-radius:4px;"
      );
      console.log(groupedForPayment);
      console.groupEnd();
      if (typeof window !== "undefined") {
        window.__CURRENT_MONTH_PAY_BUCKETS__ = groupedForPayment;
      }
    } catch (_) {}
  }, [groupedForPayment]);

  /* --------- Start Payment — batch over groupedForPayment --------- */
  function buildRowsForDeveloper(grouped, developerId) {
    // ✅ Hard-skip freelancers from bulk payment
    const roleLower = String(
      getRoleForUser(Number(developerId)) || ""
    ).toLowerCase();
    if (roleLower === "freelancer") return [];

    const dev = grouped?.[String(developerId)];
    if (!dev) return [];
    const buckets = ["1-7", "8-15", "16-23", "24-31"];
    let rid = 1;
    const rows = [];
    for (const b of buckets) {
      const arr = dev[b] || [];
      for (const it of arr) {
        const hoursNum = Number.isFinite(it?.hours) ? Number(it.hours) : 0;
        const paymentNum = Number(it?.payment || 0);

        // When grouping we already kept only flagger===0 sessions.
        // Still, skip if there’s nothing meaningful.
        if (
          Array.isArray(it.flaggers) &&
          it.flaggers.length === 0 &&
          hoursNum <= 0 &&
          paymentNum <= 0
        ) {
          continue;
        }

        rows.push({
          id: rid++,
          date: it.date,
          hours: hoursNum,
          label:
            typeof it.label === "string"
              ? it.label
              : secondsToLabel((hoursNum || 0) * 3600),
          payment: paymentNum,
          serial_ids: Array.isArray(it.serial_ids) ? it.serial_ids : [],
          session_payments: Array.isArray(it.session_payments)
            ? it.session_payments
            : [],
          flaggers: Array.isArray(it.flaggers) ? it.flaggers : [],
          user_id: Array.isArray(it.user_id) ? it.user_id : [],
          bucket: b,
          _raw: it,
        });
      }
    }
    return rows;
  }

  async function handleStartPayment() {
    try {
      const { month, ...rest } = groupedForPayment || {};
      const devIds = Object.keys(rest).filter((k) => k !== "month");

      for (const devId of devIds) {
        // ✅ Skip freelancers from bulk payment
        const roleLower = String(
          getRoleForUser(Number(devId)) || ""
        ).toLowerCase();
        if (roleLower === "freelancer") {
          console.info(`Skipping bulk payment for freelancer userId=${devId}`);
          continue;
        }

        const devKey = String(devId);
        const devBuckets = rest[devKey];
        if (!devBuckets) continue;

        console.groupCollapsed(
          `%cPAY RUN → Developer ${devKey}`,
          "color:#059669"
        );
        const rowsForDev = buildRowsForDeveloper(rest, devKey);

        let processedMap = {};
        let rowsBag = [...rowsForDev];

        for (const row of rowsForDev) {
          console.log("Row to be processed:", row);
          console.log("Current User:", currentUser);
          await submitSinglePayment({
            id: row.id,
            date: row.date,
            rows: rowsBag,
            setRows: (fn) => {
              rowsBag = typeof fn === "function" ? fn(rowsBag) : fn;
            },
            processed: processedMap,
            setProcessed: (fn) => {
              processedMap = typeof fn === "function" ? fn(processedMap) : fn;
            },
            currentUser,
            developerId: Number(devKey),
          });
        }
        console.groupEnd();
      }
      console.log(
        "PAY RUN COMPLETED (freelancers were skipped; only flagger=0 sessions processed)"
      );
    } catch (e) {
      console.error("PAY RUN ERROR:", e);
      alert(e?.message || "Payment run failed");
    }
  }

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
                      if (isCustomBtn) setRangeMode("custom");
                      else {
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

            {/* NEW: Start Payment button */}
            {isAdmin && (
              <button
                onClick={handleStartPayment}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                title="Run payments for current-month grouped data — freelancers are skipped; only flagger=0 sessions are processed"
              >
                <PlayCircle className="h-4 w-4" />
                Start Payment
              </button>
            )}

            {/* Inline custom inputs */}
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
                Scale: 0–9h
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
                    ),
                    240,
                    48,
                    9
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
              onClick={uiReadyForSelf ? handleApproveForPayment : undefined}
              disabled={buttonDisabled}
              title={uiReadyForSelf ? approvalStatusText : "Loading state…"}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition shadow-sm",
                buttonDisabled
                  ? "bg-neutral-300 text-neutral-600 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-300"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              )}
            >
              {buttonLabel}
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
      {isAdmin &&
        isAdminSelectedUserNumeric &&
        selectedUserRole === "freelancer" && (
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
                    ? "bg-rose-300 text-white cursor-not-allowed dark:bg-rose-700/50"
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

      {/* Pagination */}
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

      {/* Legend */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[15px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          Empty
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[15px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
          Light (0–3h)
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[15px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          Steady (4–7h)
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[15px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          Heavy (7–9+h)
        </span>
      </div>

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
              const dateKey = keyOf(item.date);
              const dayAll = localDetailsByDate?.[dateKey] || [];
              const daySessions = dayAll.filter((r) => {
                const pOK =
                  selectedProject === "all" || r.project_id === selectedProject;
                const uOK =
                  selectedUser === "all" || r.user_id === selectedUser;
                return pOK && uOK;
              });
              const sessionsCount = daySessions.length;
              const hasHours = typeof item.hours === "number";
              const p = progressPercent(item.hours);

              return (
                <div
                  key={`${format(item.date, "yyyy-MM-dd", {
                    locale: enUS,
                  })}-${idx}`}
                  className={cn(
                    "relative rounded-xl border p-3 text-center transition-all h-40 flex flex-col justify-between",
                    "hover:shadow-lg hover:-translate-y-[1px] group",
                    getCardBackground(item.hours),
                    getCardBorder(item.hours)
                  )}
                >
                  {/* left ribbon */}
                  <span
                    className={cn(
                      "absolute left-0 top-0 h-full w-1.5 rounded-l-xl",
                      getCardRibbon(item.hours)
                    )}
                  />
                  {/* hover glow ring */}
                  <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 group-hover:ring-2 ring-indigo-200/60 dark:ring-indigo-400/30 transition" />

                  {/* edit button if there are sessions */}
                  {sessionsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleEditIconClick(item)}
                      disabled={checkingBusy}
                      aria-busy={checkingBusy}
                      className={cn(
                        "absolute right-2 top-2 inline-flex items-center justify-center h-7 w-7 rounded-md border bg-white/80 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800",
                        "dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:bg-neutral-700",
                        "shadow-sm backdrop-blur-sm",
                        checkingBusy && "opacity-60 pointer-events-none"
                      )}
                      aria-label={`View details for ${dateKey}`}
                      title={checkingBusy ? "Checking..." : "View / edit day"}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}

                  {/* date header */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      {format(item.date, "EEE", { locale: enUS })}
                    </div>
                    <div className="text-2xl font-semibold leading-none text-neutral-900 dark:text-neutral-100">
                      {format(item.date, "d", { locale: enUS })}
                    </div>
                    <div className="text-[11px] mb-2 text-neutral-500 dark:text-neutral-400">
                      {format(item.date, "MMM yyyy", { locale: enUS })}
                    </div>
                  </div>

                  {/* center metrics */}
                  <div className="min-h-[1.1rem]">
                    {hasHours ? (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1",
                          item.label
                            ? "text-sm font-medium"
                            : "text-xl font-semibold",
                          getHourRangeTone(item.hours)
                        )}
                        title={item.label || `${item.hours}h`}
                      >
                        <Clock className="h-4 w-4" />
                        <span>{item.label ?? `${item.hours}h`}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-400 dark:text-neutral-500">
                        —
                      </div>
                    )}
                  </div>

                  {/* bottom: progress + chips */}
                  <div>
                    {/* progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-neutral-200/70 dark:bg-neutral-700/60 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          typeof item.hours !== "number"
                            ? "bg-neutral-300 dark:bg-neutral-600"
                            : item.hours <= 3
                            ? "bg-rose-500"
                            : item.hours <= 7
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        )}
                        style={{ width: `${p}%` }}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={p}
                      />
                    </div>

                    {/* chips */}
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                          getBadgeClasses(item.hours)
                        )}
                      >
                        {getRangeLabel(item.hours)}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {sessionsCount} session{sessionsCount === 1 ? "" : "s"}
                      </span>
                    </div>
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
