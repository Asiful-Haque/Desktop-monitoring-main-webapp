// src/components/ManualAttendance/ManualAttendance.js
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { Send, Users, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Pencil } from "lucide-react";
import AttendanceEditModal from "./AttendenceEditModal";
import DatePickerField from "../commonComponent/DatePickerField";


const statusOptions = [
  { value: "present", label: "Present", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  { value: "absent", label: "Absent", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  { value: "late", label: "Late", icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { value: "half_day", label: "Half Day", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
  { value: "leave", label: "Leave", icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" }
];

const pad2 = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Compare only by YYYY-MM-DD
const isDateInFuture = (yyyyMmDd) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayYmd = toYmd(today);
  return yyyyMmDd > todayYmd;
};

const ManualAttendancePage = ({ curruser, users }) => {
  const { addToast } = useToast();

  const isAdmin = useMemo(() => {
    const roleName = String(curruser?.role_name ?? curruser?.role ?? curruser?.roleType ?? curruser?.role_type ?? "")
      .trim()
      .toLowerCase();

    const isAdminFlag =
      curruser?.is_admin === true ||
      curruser?.isAdmin === true ||
      curruser?.is_admin === 1 ||
      curruser?.isAdmin === 1 ||
      curruser?.is_admin === "1";

    const roleBased =
      roleName === "admin" ||
      roleName === "administrator" ||
      roleName === "superadmin" ||
      roleName === "super_admin" ||
      roleName === "owner";

    return Boolean(isAdminFlag || roleBased);
  }, [curruser]);

  const [attendanceDate, setAttendanceDate] = useState(() => toYmd(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [isLoadingForDate, setIsLoadingForDate] = useState(false);
  const [isDateSubmitted, setIsDateSubmitted] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const openEdit = (u) => {
    if (!isAdmin) {
      addToast({
        title: "Admin Only",
        description: "Only Admin can edit attendance",
        variant: "destructive"
      });
      return;
    }
    setEditUser(u);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditUser(null);
  };

  const buildAttendanceState = (userList) => {
    const list = Array.isArray(userList) ? userList : [];
    return list.reduce((acc, u) => {
      const uid = Number(u.user_id);
      if (!uid) return acc;

      acc[uid] = {
        user_id: uid,
        selected: false,
        status: "present",
        check_in_time: "09:00",
        check_out_time: "18:00",
        notes: ""
      };
      return acc;
    }, {});
  };

  const [attendanceData, setAttendanceData] = useState(() => buildAttendanceState(users));
  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);
  useEffect(() => {
    setAttendanceData((prev) => {
      const next = buildAttendanceState(users);
      Object.keys(next).forEach((k) => {
        const uid = Number(k);
        if (prev?.[uid]) next[uid] = { ...next[uid], ...prev[uid], user_id: uid };
      });
      return next;
    });

    setSelectAll(false);
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

  const selectedCount = Object.values(attendanceData).filter((a) => a.selected).length;

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

  const loadAttendanceForDate = async (dateStr) => {
    const currentUsers = usersRef.current;
    if (!Array.isArray(currentUsers) || currentUsers.length === 0) return;

    setIsLoadingForDate(true);
    try {
      const qs = new URLSearchParams({ date: dateStr });

      const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/attendance?${qs.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error("Failed to load attendance");

      const data = await res.json();
      const rows = Array.isArray(data?.rows) ? data.rows : [];

      setIsDateSubmitted(rows.length > 0);

      setAttendanceData((prev) => {
        const updated = { ...prev };

        for (const r of rows) {
          const uid = Number(r.user_id);
          if (!uid) continue;
          if (!updated[uid]) continue;

          updated[uid] = {
            ...updated[uid],
            status: r.status ?? updated[uid].status,
            check_in_time: r.check_in_time ?? "",
            check_out_time: r.check_out_time ?? "",
            notes: r.notes ?? ""
          };
        }

        return updated;
      });
    } catch (e) {
      console.error("Load attendance error:", e);
      setIsDateSubmitted(false);
      addToast({
        title: "Load Failed",
        description: e?.message || "Could not load attendance for the selected date",
        variant: "destructive"
      });
    } finally {
      setIsLoadingForDate(false);
    }
  };

  useEffect(() => {
    loadAttendanceForDate(attendanceDate);
  }, [attendanceDate]);

  const isFuture = useMemo(() => isDateInFuture(attendanceDate), [attendanceDate]);
  const canShowEdit = isAdmin && !isFuture && isDateSubmitted;
  const isEditOnlyMode = !isFuture && isDateSubmitted;
  const lockInlineControls = isEditOnlyMode;

  useEffect(() => {
    if (isEditOnlyMode) {
      setSelectAll(false);
      setAttendanceData((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((k) => {
          const uid = Number(k);
          updated[uid] = { ...updated[uid], selected: false };
        });
        return updated;
      });
    }
  }, [isEditOnlyMode]);

  const handleSubmit = async () => {
    if (isEditOnlyMode) {
      addToast({
        title: "Already Submitted",
        description: "This date is already submitted. Please use Edit.",
        variant: "destructive"
      });
      return;
    }

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

      const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to submit attendance");

      addToast({
        title: "Success!",
        description: `Attendance submitted for ${selectedEntries.length} user(s)`,
        variant: "success"
      });

      setSelectAll(false);
      setAttendanceData((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          const uid = Number(key);
          updated[uid] = { ...updated[uid], selected: false };
        });
        return updated;
      });

      await loadAttendanceForDate(attendanceDate);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manual Attendance</h1>
          <p className="text-gray-600 mt-1">
            {isEditOnlyMode ? "Attendance submitted. Click pencil to edit." : "Mark attendance for multiple users at once"}
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

            {isFuture ? (
              <span className="text-xs text-blue-700 font-semibold bg-blue-100 px-2 py-1 rounded-full">Future date</span>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Attendance Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tenant Name</Label>
              <Input
                type="text"
                value={curruser?.tenant_name || ""}
                disabled
                className="border-[rgba(9,92,253,0.3)] focus:border-[#095cfd]"
              />
            </div>

            <DatePickerField
              label="Attendance Date"
              value={attendanceDate}
              onChange={(ymd) => setAttendanceDate(ymd)}
              className=""
              inputClassName="border-[rgba(9,92,253,0.3)] focus:border-[#095cfd]"
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
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="border-[#095cfd] checked:bg-[#095cfd]"
                />
                <Label className="text-sm cursor-pointer">Select All</Label>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Edit only</div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(Array.isArray(users) ? users : []).map((user, index) => {
              const uid = Number(user.user_id);
              const attendance = attendanceData?.[uid];
              if (!attendance) return null;

              return (
                <div
                  key={uid}
                  className="p-4 transition-all duration-200 hover:bg-muted/50"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="grid grid-cols-12 xl:grid-cols-14 gap-4 items-center">
                    <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                      {!lockInlineControls ? (
                        <input
                          type="checkbox"
                          checked={attendance.selected}
                          onChange={(e) => updateAttendance(uid, "selected", e.target.checked)}
                          className="border-[#095cfd] checked:bg-[#095cfd]"
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
                      </div>
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <Select value={attendance.status} onValueChange={() => {}} disabled={lockInlineControls || !attendance.selected}>
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
                        <Input
                          type="time"
                          value={attendance.check_in_time || ""}
                          onChange={() => {}}
                          disabled={lockInlineControls || !attendance.selected}
                          className={`pl-8 h-9 border-[rgba(9,92,253,0.3)] ${lockInlineControls || !attendance.selected ? "opacity-50" : ""}`}
                        />
                      </div>
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <div className="relative">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={attendance.check_out_time || ""}
                          onChange={() => {}}
                          disabled={lockInlineControls || !attendance.selected}
                          className={`pl-8 h-9 border-[rgba(9,92,253,0.3)] ${lockInlineControls || !attendance.selected ? "opacity-50" : ""}`}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-3 xl:col-span-4">
                      <Input
                        placeholder="Add notes..."
                        value={attendance.notes || ""}
                        onChange={() => {}}
                        disabled={lockInlineControls || !attendance.selected}
                        className={`h-9 border-[rgba(9,92,253,0.3)] ${lockInlineControls || !attendance.selected ? "opacity-50" : ""}`}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-1 flex justify-end">
                      {canShowEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => openEdit(user)}
                          className="h-9 w-9 p-0 hover:bg-[#095cfd]/10"
                          title="Edit attendance"
                        >
                          <Pencil className="w-4 h-4 text-[#095cfd]" />
                        </Button>
                      ) : (
                        <div className="h-9 w-9" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!lockInlineControls ? (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCount === 0}
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

      <AttendanceEditModal
        open={editOpen}
        onClose={closeEdit}
        curruser={curruser}
        user={editUser}
        date={attendanceDate}
        onSaved={async () => {
          await loadAttendanceForDate(attendanceDate);
        }}
      />
    </div>
  );
};

export default ManualAttendancePage;
