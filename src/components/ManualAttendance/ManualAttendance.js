// src/components/ManualAttendance/ManualAttendance.js
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { Send, Users, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";

import DatePickerField from "../commonComponent/DatePickerField";

const statusOptions = [
  { value: "present", label: "Present", icon: CheckCircle2, color: "text-green-500" },
  { value: "absent", label: "Absent", icon: XCircle, color: "text-red-500" },
  { value: "late", label: "Late", icon: AlertCircle, color: "text-yellow-500" },
  { value: "half_day", label: "Half Day", icon: Clock, color: "text-orange-500" },
  { value: "leave", label: "Leave", icon: Calendar, color: "text-blue-500" }
];

const pad2 = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const isDateInFuture = (yyyyMmDd) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return yyyyMmDd > toYmd(today);
};

const DEBUG_ATTENDANCE = process.env.NEXT_PUBLIC_ATTENDANCE_DEBUG === "true";
const dbg = (...args) => {
  if (DEBUG_ATTENDANCE) console.log("[ManualAttendance]", ...args);
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

  if (!s || !e) return { ok: false, reason: "missing_start_or_end", s, e };

  const sYmd = toYmd(s);
  const eYmd = toYmd(e);

  if (sYmd !== ymd || eYmd !== ymd) {
    return { ok: false, reason: "cross_day", s, e, sYmd, eYmd, ymd };
  }

  const sMs = s.getTime();
  const eMs = e.getTime();
  if (!Number.isFinite(sMs) || !Number.isFinite(eMs)) return { ok: false, reason: "invalid_ms", s, e };

  const startMs = Math.min(sMs, eMs);
  const endMs = Math.max(sMs, eMs);
  return { ok: true, startMs, endMs, s, e };
};

const getRowStart = (r) => r?.task_start ?? r?.start_time ?? r?.started_at ?? r?.check_in ?? r?.start ?? r?.begin ?? null;
const getRowEnd = (r) => r?.task_end ?? r?.end_time ?? r?.ended_at ?? r?.check_out ?? r?.end ?? r?.finish ?? null;

const normEmail = (v) => {
  if (!v) return "";
  return String(v).trim().toLowerCase();
};

const ManualAttendancePage = ({ curruser, users }) => {
  const { addToast } = useToast();

  const [attendanceDate, setAttendanceDate] = useState(() => toYmd(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const [isLoadingForDate, setIsLoadingForDate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isDateSubmitted, setIsDateSubmitted] = useState(false);
  const [activityByUserId, setActivityByUserId] = useState({});

  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const loadSeqRef = useRef(0);

  const buildAttendanceState = (userList) => {
    const list = Array.isArray(userList) ? userList : [];
    return list.reduce((acc, u) => {
      const uid = Number(u.user_id);
      if (!uid) return acc;
      acc[uid] = {
        user_id: uid,
        selected: false,
        status: "absent",
        check_in_time: "",
        check_out_time: "",
        notes: ""
      };
      return acc;
    }, {});
  };

  const [attendanceData, setAttendanceData] = useState(() => buildAttendanceState(users));

  useEffect(() => {
    setAttendanceData(buildAttendanceState(users));
    setSelectAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  const updateAttendance = (userId, field, value) => {
    const uid = Number(userId);
    setAttendanceData((prev) => ({
      ...prev,
      [uid]: { ...prev[uid], [field]: value }
    }));
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    setAttendanceData((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        const uid = Number(key);
        updated[uid] = { ...updated[uid], selected: checked };
      });
      return updated;
    });
  };

  const selectedCount = useMemo(() => Object.values(attendanceData).filter((a) => a.selected).length, [attendanceData]);
  const isFuture = useMemo(() => isDateInFuture(attendanceDate), [attendanceDate]);

  const lockInlineControls = isFuture || isDateSubmitted;

  const applyToAll = (field, value) => {
    setAttendanceData((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        const uid = Number(key);
        if (updated[uid]?.selected) updated[uid] = { ...updated[uid], [field]: value };
      });
      return updated;
    });
  };

  const loadAttendanceForDate = async (dateStr, seq) => {
    const currentUsers = usersRef.current;
    if (!Array.isArray(currentUsers) || currentUsers.length === 0) return false;

    setIsLoadingForDate(true);
    try {
      const qs = new URLSearchParams({ date: dateStr });

      const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/attendance?${qs.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store"
      });

      if (!res.ok) throw new Error("Failed to load attendance");

      const data = await res.json();
      const rows = Array.isArray(data?.rows) ? data.rows : [];

      const submitted = rows.length > 0;
      if (seq !== loadSeqRef.current) return submitted;

      setIsDateSubmitted(submitted);

      setAttendanceData((prev) => {
        const base = buildAttendanceState(usersRef.current);

        if (!submitted) {
          Object.keys(base).forEach((k) => {
            const uid = Number(k);
            if (prev?.[uid]?.selected) base[uid].selected = true;
          });
        }

        for (const r of rows) {
          const uid = Number(r.user_id);
          if (!uid || !base[uid]) continue;
          base[uid] = {
            ...base[uid],
            notes: r.notes ?? base[uid].notes
          };
        }

        return base;
      });

      return submitted;
    } catch (e) {
      console.error("Load attendance error:", e);
      if (seq === loadSeqRef.current) {
        setIsDateSubmitted(false);
        addToast({
          title: "Load Failed",
          description: e?.message || "Could not load attendance for the selected date",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      if (seq === loadSeqRef.current) setIsLoadingForDate(false);
    }
  };

  const buildUserResolvers = () => {
    const list = Array.isArray(usersRef.current) ? usersRef.current : [];

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

    const uiName = (uiId) => {
      const u = byUiUserId.get(Number(uiId));
      return u?.username || u?.name || u?.full_name || "";
    };

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
        if (mappedUi) return { uiUserId: mappedUi, via: `devId:${devId}` };
      }

      for (const em of emailCandidates) {
        const mappedUi = byEmail.get(em);
        if (mappedUi) return { uiUserId: mappedUi, via: `email:${em}` };
      }

      for (const uiId of uiIdCandidates) {
        if (byUiUserId.has(uiId)) return { uiUserId: uiId, via: `uiUserId:${uiId}` };
      }

      return { uiUserId: null, via: "unresolved" };
    };

    return { resolveActivityToUiUserId, uiName };
  };

  const loadActivityWindowForDate = async (dateStr, submittedFlag, seq) => {
    const apiUrl = process.env.NEXT_PUBLIC_MAIN_HOST
      ? `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/time-sheet/by-date-range`
      : "/api/time-sheet/by-date-range";

    const body = {
      startDate: dateStr,
      endDate: dateStr,
      all: true,
      userId: curruser?.id ?? null,
      userRole: curruser?.role || curruser?.user_role || curruser?.role_name || "Developer",
      tenant_id: curruser?.tenant_id ?? null
    };

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store"
      });

      if (!res.ok) throw new Error(`Failed to load activity (${res.status})`);

      const payload = await res.json();
      const rows = Array.isArray(payload?.items) ? payload.items : [];

      if (seq !== loadSeqRef.current) return;

      const { resolveActivityToUiUserId, uiName } = buildUserResolvers();

      dbg("Activity fetch date:", dateStr, "items:", rows.length);

      const map = new Map();

      for (const r of rows) {
        const { uiUserId, via } = resolveActivityToUiUserId(r);

        const raw = {
          serial_id: r?.serial_id,
          user_id: r?.user_id,
          dev_user_id: r?.dev_user_id,
          developer_id: r?.developer_id,
          employee_id: r?.employee_id,
          developer_name: r?.developer_name,
          developer_email: r?.developer_email,
          task_start: r?.task_start,
          task_end: r?.task_end
        };

        if (!uiUserId) {
          dbg("Skip row (cannot resolve to UI user)", { via, raw });
          continue;
        }

        const v = validateStartEndForDate(getRowStart(r), getRowEnd(r), dateStr);
        if (!v.ok) {
          dbg("Skip row (strict fail)", {
            uiUserId,
            uiName: uiName(uiUserId),
            via,
            reason: v.reason,
            raw,
            parsed: {
              s: v.s ? v.s.toString() : null,
              e: v.e ? v.e.toString() : null,
              sYmd: v.sYmd,
              eYmd: v.eYmd,
              expected: dateStr
            }
          });
          continue;
        }

        const startHHmm = fmtHHmm(new Date(v.startMs));
        const endHHmm = fmtHHmm(new Date(v.endMs));

        dbg("Use row", {
          uiUserId,
          uiName: uiName(uiUserId),
          via,
          startLocal: new Date(v.startMs).toString(),
          endLocal: new Date(v.endMs).toString(),
          startHHmm,
          endHHmm,
          raw
        });

        const curr = map.get(uiUserId) || {
          minStartMs: Number.POSITIVE_INFINITY,
          maxEndMs: Number.NEGATIVE_INFINITY,
          rows: []
        };

        if (v.startMs < curr.minStartMs) curr.minStartMs = v.startMs;
        if (v.endMs > curr.maxEndMs) curr.maxEndMs = v.endMs;

        curr.rows.push({ serial_id: r?.serial_id, startHHmm, endHHmm, via });
        map.set(uiUserId, curr);
      }

      const activityObj = {};
      map.forEach((v, uiUserId) => {
        const startHHmm = Number.isFinite(v.minStartMs) ? fmtHHmm(new Date(v.minStartMs)) : "";
        const endHHmm = Number.isFinite(v.maxEndMs) ? fmtHHmm(new Date(v.maxEndMs)) : "";
        const hasTimes = Boolean(startHHmm && endHHmm);

        activityObj[uiUserId] = { startHHmm, endHHmm, hasTimes, rows: v.rows };
      });

      dbg("Activity summary (by UI user_id)", activityObj);


      const presentDebug = Object.entries(activityObj)
        .filter(([, a]) => a.hasTimes)
        .map(([uid, a]) => ({
          uiUserId: Number(uid),
          uiName: uiName(Number(uid)),
          range: `${a.startHHmm} -> ${a.endHHmm}`,
          sessions: a.rows
        }));

      dbg("Users that will be PRESENT (activity-based)", presentDebug);

      setActivityByUserId(activityObj);

      const future = isDateInFuture(dateStr);
      const submitted = Boolean(submittedFlag);

      setAttendanceData((prev) => {
        const updated = { ...prev };

        Object.keys(updated).forEach((k) => {
          const uid = Number(k);
          const a = activityObj?.[uid];

          const hasTimes = Boolean(a?.hasTimes);
          const startHHmm = hasTimes ? a.startHHmm : "";
          const endHHmm = hasTimes ? a.endHHmm : "";

          updated[uid] = {
            ...updated[uid],
            check_in_time: startHHmm,
            check_out_time: endHHmm,
            status: hasTimes ? "present" : "absent",
            selected: (!submitted && !future && hasTimes) ? true : false
          };
        });

        return updated;
      });

      setSelectAll(false);
    } catch (e) {
      console.error("Load activity error:", e);
      if (seq !== loadSeqRef.current) return;

      setActivityByUserId({});

      setAttendanceData((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((k) => {
          const uid = Number(k);
          updated[uid] = { ...updated[uid], check_in_time: "", check_out_time: "", selected: false, status: "absent" };
        });
        return updated;
      });

      addToast({
        title: "Activity Load Failed",
        description: e?.message || "Could not load activity time for the selected date",
        variant: "destructive"
      });
    }
  };

  const loadAllForDate = async (dateStr) => {
    const seq = ++loadSeqRef.current;

    setSelectAll(false);
    setActivityByUserId({});
    setAttendanceData(buildAttendanceState(usersRef.current));

    const submitted = await loadAttendanceForDate(dateStr, seq);
    if (seq !== loadSeqRef.current) return;

    await loadActivityWindowForDate(dateStr, submitted, seq);
  };

  useEffect(() => {
    loadAllForDate(attendanceDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAllForDate(attendanceDate);
      addToast({ title: "Refreshed", description: "Actual data loaded.", variant: "success" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const postAttendance = async (payloadArray) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadArray)
    });
    if (!res.ok) throw new Error("Failed to save attendance");
  };

  const handleSubmitAttendance = async () => {
    if (isFuture) {
      addToast({
        title: "Not Allowed",
        description: "Future date attendance submission is not allowed.",
        variant: "destructive"
      });
      return;
    }
    if (isDateSubmitted) return;

    const selectedEntries = Object.values(attendanceData).filter((a) => a.selected);

    if (selectedEntries.length === 0) {
      addToast({
        title: "No Users Selected",
        description: "Please select at least one user to submit attendance",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = selectedEntries.map((entry) => ({
        tenant_id: curruser?.tenant_id,
        user_id: entry.user_id,
        attendance_day: `${attendanceDate}T00:00:00`,
        status: entry.status,
        check_in_time: entry.check_in_time || null,
        check_out_time: entry.check_out_time || null,
        notes: entry.notes || null,
        last_updated_by: curruser?.id ? parseInt(curruser.id) : 1
      }));

      await postAttendance(payload);

      addToast({
        title: "Success!",
        description: `Attendance submitted for ${selectedEntries.length} user(s)`,
        variant: "success"
      });

      setSelectAll(false);
      await loadAllForDate(attendanceDate);
    } catch (error) {
      console.error("Submission error:", error);
      addToast({
        title: "Submission Failed",
        description: "Could not submit attendance records. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manual Attendance</h1>
          <p className="text-gray-600 mt-1">
            {isFuture ? "Future date is read only." : isDateSubmitted ? "Attendance submitted (read only)." : "Mark attendance for multiple users at once"}
          </p>

          <div className="flex items-center gap-3 mt-2">
            {isLoadingForDate ? (
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </span>
            ) : null}

            {!isFuture && isDateSubmitted ? (
              <span className="text-xs text-green-700 font-semibold bg-green-100 px-2 py-1 rounded-full">Submitted</span>
            ) : null}

            {isFuture ? <span className="text-xs text-blue-700 font-semibold bg-blue-100 px-2 py-1 rounded-full">Future date</span> : null}
          </div>
        </div>

        <Button type="button" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
          {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Attendance Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tenant Name</Label>
              <Input type="text" value={curruser?.tenant_name || ""} disabled className="border-[rgba(9,92,253,0.3)]" />
            </div>

            <DatePickerField
              label="Attendance Date"
              value={attendanceDate}
              onChange={(ymd) => setAttendanceDate(ymd)}
              inputClassName="border-[rgba(9,92,253,0.3)]"
            />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Apply Status to Selected</Label>
              <Select onValueChange={(v) => applyToAll("status", v)} disabled={lockInlineControls}>
                <SelectTrigger className={`border-[rgba(9,92,253,0.3)] ${lockInlineControls ? "opacity-50" : ""}`}>
                  <SelectValue placeholder={lockInlineControls ? "Disabled" : "Apply to selected"} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className={`w-4 h-4 ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Users</Label>
              <div className="h-10 px-4 rounded-lg bg-gradient-to-r from-[#095cfd]/10 to-[#0b4dd5]/10 border border-[#095cfd]/20 flex items-center">
                <Users className="w-4 h-4 text-[#095cfd] mr-2" />
                <span className="font-bold text-[#095cfd]">{lockInlineControls ? 0 : selectedCount}</span>
                <span className="text-muted-foreground ml-1">/ {Array.isArray(users) ? users.length : 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-[#095cfd]/5 to-transparent border-b border-[rgba(9,92,253,0.1)]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Team Members</CardTitle>

            {!lockInlineControls ? (
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} className="h-4 w-4" />
                <Label className="text-sm cursor-pointer">Select All</Label>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Read only</div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(Array.isArray(users) ? users : []).map((user) => {
              const uid = Number(user.user_id);
              const attendance = attendanceData?.[uid];
              if (!attendance) return null;

              const activity = activityByUserId?.[uid] || null;
              const activityLabel =
                activity?.hasTimes && activity?.startHHmm && activity?.endHHmm ? `${activity.startHHmm} → ${activity.endHHmm}` : "";

              return (
                <div key={uid} className="p-4 transition-all duration-200 hover:bg-muted/50">
                  <div className="grid grid-cols-12 xl:grid-cols-14 gap-4 items-center">
                    <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                      {!lockInlineControls ? (
                        <input
                          type="checkbox"
                          checked={attendance.selected}
                          onChange={(e) => updateAttendance(uid, "selected", e.target.checked)}
                          className="h-4 w-4"
                        />
                      ) : (
                        <div className="w-4" />
                      )}

                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#095cfd] to-[#0b4dd5] flex items-center justify-center text-white font-bold text-sm">
                        {(user?.username?.[0] || "?").toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium truncate">{user?.username || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.role_name || ""}</p>

                        {activityLabel ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Activity: <span className="font-medium">{activityLabel}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <Select
                        value={attendance.status}
                        onValueChange={(v) => updateAttendance(uid, "status", v)}
                        disabled={lockInlineControls || !attendance.selected}
                      >
                        <SelectTrigger className={`border-[rgba(9,92,253,0.3)] h-9 ${lockInlineControls || !attendance.selected ? "opacity-50" : ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <opt.icon className={`w-4 h-4 ${opt.color}`} />
                                {opt.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <div className="relative">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="time" value={attendance.check_in_time || ""} disabled className="pl-8 h-9 border-[rgba(9,92,253,0.3)] opacity-70" />
                      </div>
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <div className="relative">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="time" value={attendance.check_out_time || ""} disabled className="pl-8 h-9 border-[rgba(9,92,253,0.3)] opacity-70" />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-3 xl:col-span-4">
                      <Input
                        placeholder="Add notes..."
                        value={attendance.notes || ""}
                        onChange={(e) => updateAttendance(uid, "notes", e.target.value)}
                        disabled={lockInlineControls || !attendance.selected}
                        className={`h-9 border-[rgba(9,92,253,0.3)] ${lockInlineControls || !attendance.selected ? "opacity-50" : ""}`}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-1 flex justify-end">
                      <div className="h-9 w-9" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!isFuture && !isDateSubmitted ? (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmitAttendance}
            disabled={isSubmitting}
            size="lg"
            className="bg-gradient-to-r from-[#095cfd] to-[#0b4dd5] hover:from-[#0b4dd5] hover:to-[#063aa8] text-white shadow-xl shadow-[#095cfd]/30 px-8 py-6 text-lg font-semibold disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Attendance ({selectedCount})
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default ManualAttendancePage;
