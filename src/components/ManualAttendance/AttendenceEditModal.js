// src/components/ManualAttendance/AttendenceEditModal.js
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X, CheckCircle2 } from "lucide-react";

const statusOptions = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" }
];

const pad2 = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const isDateInFuture = (yyyyMmDd) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return yyyyMmDd > toYmd(today);
};

export default function AttendanceEditModal({
  open,
  onClose,
  user,
  date,
  initialStatus = "present",
  initialNotes = "",
  onApply
}) {
  const { addToast } = useToast();

  const [form, setForm] = useState({ status: "present", notes: "" });

  const canShow = open && user?.user_id && date;

  const title = useMemo(() => {
    if (!user) return "Edit Attendance";
    return `Edit Attendance: ${user.username}`;
  }, [user]);

  useEffect(() => {
    if (!canShow) return;
    setForm({
      status: initialStatus ?? "present",
      notes: initialNotes ?? ""
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canShow, user?.user_id, date, initialStatus, initialNotes]);

  const handleApply = () => {
    if (!user?.user_id) return;

    if (isDateInFuture(date)) {
      addToast({
        title: "Not Allowed",
        description: "Future date editing is not allowed.",
        variant: "destructive"
      });
      return;
    }

    onApply?.({
      user_id: user.user_id,
      status: form.status,
      notes: form.notes
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white">
          <CardHeader className="border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Date: <span className="font-medium text-gray-700">{date}</span>
                {user?.role_name ? (
                  <>
                    <span className="mx-2">•</span>
                    Role: <span className="font-medium text-gray-700">{user.role_name}</span>
                  </>
                ) : null}
              </p>
            </div>

            <Button variant="ghost" onClick={onClose} className="h-9 w-9 p-0">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="border-[rgba(9,92,253,0.3)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Add notes..."
                  className="border-[rgba(9,92,253,0.3)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>

              <Button onClick={handleApply} className="bg-gradient-to-r from-[#095cfd] to-[#0b4dd5] text-white gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
