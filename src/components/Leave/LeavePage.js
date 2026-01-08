// src/components/Leave/Leave.js
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw, Search, ChevronDown, ChevronUp } from "lucide-react";

import DatePickerField from "../commonComponent/DatePickerField";
import LeaveCharts from "./LeaveCharts";

const pad2 = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const isDateInFuture = (yyyyMmDd) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return yyyyMmDd > toYmd(today);
};

const parseDateTime = (v) => {
  if (v === null || v === undefined || v === "") return null;

  if (typeof v === "number") {
    const ms = v > 1e12 ? v : v * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const s = String(v).trim();
  if (!s) return null;

  const mysqlLike = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s);
  const normalized = mysqlLike ? s.replace(/\s+/, "T") : s;

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtHHmm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const validateStartEndForDate = (startVal, endVal, ymd) => {
  const s = parseDateTime(startVal);
  const e = parseDateTime(endVal);
  if (!s || !e) return { ok: false };

  const sYmd = toYmd(s);
  const eYmd = toYmd(e);
  if (sYmd !== ymd || eYmd !== ymd) return { ok: false };

  const sMs = s.getTime();
  const eMs = e.getTime();
  if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return { ok: false };

  return { ok: true, startMs: Math.min(sMs, eMs), endMs: Math.max(sMs, eMs) };
};

const getRowStart = (r) => r?.task_start ?? r?.start_time ?? r?.started_at ?? r?.check_in ?? r?.start ?? r?.begin ?? null;
const getRowEnd = (r) => r?.task_end ?? r?.end_time ?? r?.ended_at ?? r?.check_out ?? r?.end ?? r?.finish ?? null;

const normEmail = (v) => (!v ? "" : String(v).trim().toLowerCase());

const getAttendanceStatus = (r) => r?.status ?? r?.attendance_status ?? r?.attendanceStatus ?? null;
const getAttendanceNotes = (r) => r?.notes ?? r?.note ?? "";

const normalizeStatus = (rawStatus) => {
  const s = String(rawStatus || "").trim().toLowerCase();
  if (!s) return "absent";
  if (s === "leave") return "leave";
  if (s === "present") return "present";
  if (s === "late") return "late";
  if (s === "half_day" || s === "half day") return "half_day";
  if (s === "absent") return "absent";
  return "absent";
};

const STATUS_META = {
  present: { label: "Present", icon: CheckCircle2, pill: "bg-green-100 text-green-800 border-green-200" },
  leave: { label: "Leave", icon: Calendar, pill: "bg-blue-100 text-blue-800 border-blue-200" },
  late: { label: "Late", icon: AlertCircle, pill: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  half_day: { label: "Half Day", icon: Clock, pill: "bg-orange-100 text-orange-800 border-orange-200" },
  absent: { label: "Absent", icon: XCircle, pill: "bg-red-100 text-red-800 border-red-200" }
};

const STATUS_ORDER = ["present", "leave", "late", "half_day", "absent"];

const statusOptions = [
  { value: "all", label: "All" },
  { value: "present", label: "Present" },
  { value: "leave", label: "Leave" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "absent", label: "Absent" }
];

const niceNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

const buildUserResolvers = (users) => {
  const list = Array.isArray(users) ? users : [];

  const byUiUserId = new Map();
  const byDevId = new Map();
  const byEmail = new Map();

  for (const u of list) {
    const uiId = Number(u?.user_id);
    if (Number.isFinite(uiId) && uiId > 0) byUiUserId.set(uiId, u);

    const devIdCandidates = [u?.dev_user_id, u?.developer_id, u?.employee_id, u?.developerId, u?.devUserId]
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);

    for (const devId of devIdCandidates) {
      if (!byDevId.has(devId)) byDevId.set(devId, uiId);
    }

    const emailCandidates = [u?.email, u?.user_email, u?.developer_email, u?.work_email].map(normEmail).filter(Boolean);
    for (const em of emailCandidates) {
      if (!byEmail.has(em)) byEmail.set(em, uiId);
    }
  }

  const resolveActivityToUiUserId = (row) => {
    const devIdCandidates = [row?.dev_user_id, row?.developer_id, row?.employee_id]
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);

    const emailCandidates = [row?.developer_email, row?.email].map(normEmail).filter(Boolean);

    const uiIdCandidates = [row?.user_id, row?.userId]
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);

    for (const devId of devIdCandidates) {
      const mappedUi = byDevId.get(devId);
      if (mappedUi) return mappedUi;
    }
    for (const em of emailCandidates) {
      const mappedUi = byEmail.get(em);
      if (mappedUi) return mappedUi;
    }
    for (const uiId of uiIdCandidates) {
      if (byUiUserId.has(uiId)) return uiId;
    }
    return null;
  };

  return { resolveActivityToUiUserId };
};

const buildBaseRows = (users) => {
  const list = Array.isArray(users) ? users : [];
  const base = {};
  for (const u of list) {
    const uid = Number(u?.user_id);
    if (!uid) continue;
    base[uid] = {
      user_id: uid,
      username: u?.username || u?.name || u?.full_name || "Unknown",
      role_name: u?.role_name || "",
      status: "absent",
      notes: "",
      check_in_time: "",
      check_out_time: "",
      source: "default"
    };
  }
  return base;
};

const initials = (name) => {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
};

export default function LeaveDashboard({ curruser, users, canPickDate }) {
  const { addToast } = useToast();

  const apiBase = process.env.NEXT_PUBLIC_MAIN_HOST || "";
  const today = useMemo(() => toYmd(new Date()), []);

  const [selectedDate, setSelectedDate] = useState(today);
  const effectiveDate = canPickDate ? selectedDate : today;

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("name_asc"); // name_asc | name_desc | status
  const [expandedUserId, setExpandedUserId] = useState(null);

  const [rowsByUserId, setRowsByUserId] = useState({});

  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const loadSeqRef = useRef(0);

  const loadAttendanceRows = async (dateStr) => {
    const qs = new URLSearchParams({ date: dateStr });
    const res = await fetch(`${apiBase}/api/attendance?${qs.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error("Failed to load attendance");
    const json = await res.json();
    return Array.isArray(json?.rows) ? json.rows : [];
  };

  const loadActivityRows = async (dateStr) => {
    const body = {
      startDate: dateStr,
      endDate: dateStr,
      all: true,
      userId: curruser?.id ?? null,
      userRole: curruser?.role || curruser?.user_role || curruser?.role_name || "Developer",
      tenant_id: curruser?.tenant_id ?? null
    };

    const res = await fetch(`${apiBase}/api/time-sheet/by-date-range`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    if (!res.ok) throw new Error(`Failed to load activity (${res.status})`);
    const json = await res.json();
    return Array.isArray(json?.items) ? json.items : [];
  };

  const buildDayStatus = async (dateStr, seq) => {
    const list = usersRef.current;

    if (!Array.isArray(list) || list.length === 0) {
      setRowsByUserId({});
      return;
    }

    const [attendanceRows, activityRows] = await Promise.all([loadAttendanceRows(dateStr), loadActivityRows(dateStr)]);
    if (seq !== loadSeqRef.current) return;

    const base = buildBaseRows(list);

    // Apply attendance rows first
    for (const r of attendanceRows) {
      const uid = Number(r?.user_id);
      if (!uid || !base[uid]) continue;

      base[uid] = {
        ...base[uid],
        status: normalizeStatus(getAttendanceStatus(r)),
        notes: getAttendanceNotes(r) || "",
        source: "attendance"
      };
    }

    // Build activity window and mark present ONLY if no attendance row exists
    const { resolveActivityToUiUserId } = buildUserResolvers(list);

    const activityMap = new Map();
    for (const r of activityRows) {
      const uiUserId = resolveActivityToUiUserId(r);
      if (!uiUserId || !base[uiUserId]) continue;

      const v = validateStartEndForDate(getRowStart(r), getRowEnd(r), dateStr);
      if (!v.ok) continue;

      const curr = activityMap.get(uiUserId) || {
        minStartMs: Number.POSITIVE_INFINITY,
        maxEndMs: Number.NEGATIVE_INFINITY
      };

      if (v.startMs < curr.minStartMs) curr.minStartMs = v.startMs;
      if (v.endMs > curr.maxEndMs) curr.maxEndMs = v.endMs;

      activityMap.set(uiUserId, curr);
    }

    activityMap.forEach((v, uid) => {
      if (!base[uid]) return;
      if (base[uid].source === "attendance") return;

      const startHHmm = Number.isFinite(v.minStartMs) ? fmtHHmm(new Date(v.minStartMs)) : "";
      const endHHmm = Number.isFinite(v.maxEndMs) ? fmtHHmm(new Date(v.maxEndMs)) : "";

      if (startHHmm && endHHmm) {
        base[uid] = {
          ...base[uid],
          status: "present",
          check_in_time: startHHmm,
          check_out_time: endHHmm,
          source: "activity"
        };
      }
    });

    setRowsByUserId(base);
  };

  const loadAll = async () => {
    const seq = ++loadSeqRef.current;
    setIsLoading(true);
    setExpandedUserId(null);

    try {
      await buildDayStatus(effectiveDate, seq);
    } catch (e) {
      console.error(e);
      addToast({
        title: "Load Failed",
        description: e?.message || "Could not load leave data",
        variant: "destructive"
      });
    } finally {
      if (seq === loadSeqRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDate, users]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAll();
      addToast({ title: "Refreshed", description: "Latest day status loaded.", variant: "success" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const isFuture = useMemo(() => isDateInFuture(effectiveDate), [effectiveDate]);

  const summary = useMemo(() => {
    const all = Object.values(rowsByUserId || {});
    const counts = {
      total: all.length,
      present: 0,
      leave: 0,
      late: 0,
      half_day: 0,
      absent: 0
    };
    for (const r of all) {
      const st = normalizeStatus(r?.status);
      if (counts[st] === undefined) continue;
      counts[st] += 1;
    }
    return counts;
  }, [rowsByUserId]);

  const sourceSummary = useMemo(() => {
    const all = Object.values(rowsByUserId || {});
    const counts = { attendance: 0, activity: 0, default: 0 };
    for (const r of all) {
      const k = String(r?.source || "default");
      if (counts[k] === undefined) counts.default += 1;
      else counts[k] += 1;
    }
    return counts;
  }, [rowsByUserId]);

  const filteredList = useMemo(() => {
    const all = Object.values(rowsByUserId || {});
    const f = String(filterStatus || "all");

    const s = String(searchText || "").trim().toLowerCase();

    let list = f === "all" ? all : all.filter((r) => normalizeStatus(r?.status) === f);

    if (s) {
      list = list.filter((r) => String(r?.username || "").toLowerCase().includes(s));
    }

    if (sortBy === "name_desc") {
      list = list.sort((a, b) => String(b?.username || "").localeCompare(String(a?.username || "")));
    } else if (sortBy === "status") {
      const rank = new Map(STATUS_ORDER.map((k, i) => [k, i]));
      list = list.sort((a, b) => (rank.get(normalizeStatus(a?.status)) ?? 99) - (rank.get(normalizeStatus(b?.status)) ?? 99));
    } else {
      list = list.sort((a, b) => String(a?.username || "").localeCompare(String(b?.username || "")));
    }

    return list;
  }, [rowsByUserId, filterStatus, searchText, sortBy]);

  const quickCards = useMemo(() => {
    const items = [
      { k: "present", label: "Present", icon: CheckCircle2, count: niceNum(summary.present), pill: STATUS_META.present.pill },
      { k: "leave", label: "Leave", icon: Calendar, count: niceNum(summary.leave), pill: STATUS_META.leave.pill },
      { k: "late", label: "Late", icon: AlertCircle, count: niceNum(summary.late), pill: STATUS_META.late.pill },
      { k: "half_day", label: "Half Day", icon: Clock, count: niceNum(summary.half_day), pill: STATUS_META.half_day.pill },
      { k: "absent", label: "Absent", icon: XCircle, count: niceNum(summary.absent), pill: STATUS_META.absent.pill }
    ];
    return items;
  }, [summary]);

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-[#095cfd]" />
            Your Company: {curruser?.tenant_name || ""}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mt-3">Leave</h1>
          <p className="text-gray-600 mt-1">{canPickDate ? "Day wise view with filters and charts" : "Today view only"}</p>

          <div className="flex items-center gap-3 mt-2">
            {isLoading ? (
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </span>
            ) : null}

            {isFuture ? (
              <span className="text-xs text-blue-700 font-semibold bg-blue-100 px-2 py-1 rounded-full">Future date</span>
            ) : null}

            <span className="text-xs text-muted-foreground">
              Showing: <span className="font-semibold text-slate-900">{effectiveDate}</span>
            </span>
          </div>
        </div>

        <Button type="button" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="gap-2 bg-white/70">
          {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date</Label>
              {canPickDate ? (
                <DatePickerField
                  label=""
                  value={effectiveDate}
                  onChange={(ymd) => setSelectedDate(ymd)}
                  inputClassName="border-[rgba(9,92,253,0.3)]"
                />
              ) : (
                <Input type="text" value={effectiveDate} disabled className="border-[rgba(9,92,253,0.3)]" />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Filter Status</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
                <SelectTrigger className="border-[rgba(9,92,253,0.3)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by name..."
                  className="pl-9 border-[rgba(9,92,253,0.3)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                <SelectTrigger className="border-[rgba(9,92,253,0.3)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name (A to Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z to A)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Result</Label>
              <div className="h-10 px-4 rounded-lg bg-gradient-to-r from-[#095cfd]/10 to-[#0b4dd5]/10 border border-[#095cfd]/20 flex items-center">
                <Users className="w-4 h-4 text-[#095cfd] mr-2" />
                <span className="font-bold text-[#095cfd]">{filteredList.length}</span>
                <span className="text-muted-foreground ml-1">/ {summary.total}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickCards.map((c) => {
              const Icon = c.icon;
              const active = filterStatus === c.k;

              return (
                <button
                  key={c.k}
                  type="button"
                  onClick={() => setFilterStatus(active ? "all" : c.k)}
                  className={`text-left rounded-xl border shadow-sm bg-white/70 px-4 py-3 transition hover:shadow-md ${
                    active ? "border-slate-900 ring-2 ring-slate-900/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold ${c.pill}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {c.label}
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{c.count}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{active ? "Click to clear" : "Click to filter"}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <LeaveCharts
        summary={summary}
        sourceSummary={sourceSummary}
        selectedStatus={filterStatus}
        onSelectStatus={(k) => setFilterStatus(k || "all")}
      />

      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#095cfd]/5 to-transparent border-b border-[rgba(9,92,253,0.1)]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Team Status</CardTitle>
            <div className="text-xs text-muted-foreground">
              {filterStatus === "all" ? "All statuses" : `Filtered: ${STATUS_META[filterStatus]?.label || filterStatus}`}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {filteredList.map((r) => {
                console.log("Full data for user999999999999999:", r);
                const st = normalizeStatus(r.status);
                const Meta = STATUS_META[st] || STATUS_META.absent;
                const Icon = Meta.icon;
                const open = expandedUserId === r.user_id;
                const activityLabel = r?.check_in_time && r?.check_out_time ? `${r.check_in_time} to ${r.check_out_time}` : "";

                return (
                  <motion.div
                    key={r.user_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="p-4 hover:bg-muted/40"
                  >
                    <div className="grid grid-cols-12 xl:grid-cols-14 gap-4 items-center">
                      <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#095cfd] to-[#0b4dd5] flex items-center justify-center text-white font-bold text-sm">
                          {initials(r.username)}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold truncate text-slate-900">{r.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.role_name || ""}</p>

                          {activityLabel ? (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              Activity: <span className="font-medium">{activityLabel}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="col-span-6 md:col-span-3">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${Meta.pill}`}>
                          <Icon className="w-4 h-4" />
                          {Meta.label}
                        </div>


                      </div>

                      <div className="col-span-6 md:col-span-4">
                        <div className="text-xs text-muted-foreground">Notes</div>
                        <div className="text-sm text-slate-800 truncate">{r?.notes ? r.notes : "No notes"}</div>
                      </div>

                      <div className="col-span-12 md:col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-white/70"
                          onClick={() => setExpandedUserId(open ? null : r.user_id)}
                        >
                          {open ? (
                            <span className="inline-flex items-center gap-2">
                              Hide <ChevronUp className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              Details <ChevronDown className="w-4 h-4" />
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {open ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-xl border bg-white/70 p-4">
                              <div className="text-xs text-muted-foreground">Status</div>
                              <div className="mt-1 text-base font-bold text-slate-900">{Meta.label}</div>
                            </div>

                            <div className="rounded-xl border bg-white/70 p-4">
                              <div className="text-xs text-muted-foreground">Activity window</div>
                              <div className="mt-1 text-base font-bold text-slate-900">{activityLabel || "No activity"}</div>
                            </div>

                            <div className="rounded-xl border bg-white/70 p-4">
                              <div className="text-xs text-muted-foreground">Notes</div>
                              <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{r?.notes || "No notes"}</div>
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {!isLoading && filteredList.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No users found for this filter.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Tip: Click any chart segment or quick card to filter. Click again to reset.
      </div>
    </div>
  );
}
