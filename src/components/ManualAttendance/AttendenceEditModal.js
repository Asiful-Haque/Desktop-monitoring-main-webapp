"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, Save, RefreshCw } from "lucide-react";

const statusOptions = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" },
  { value: "holiday", label: "Holiday" },
  { value: "weekend", label: "Weekend" },
];

export default function AttendanceEditModal({
  open,
  onClose,
  curruser,
  user,
  date, // "YYYY-MM-DD"
  onSaved,
}) {
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    status: "present",
    check_in_time: "09:00",
    check_out_time: "18:00",
    notes: "",
  });

  const canShow = open && user?.user_id && date;

  const title = useMemo(() => {
    if (!user) return "Edit Attendance";
    return `Edit Attendance: ${user.username}`;
  }, [user]);

  const loadExisting = async () => {
    if (!user?.user_id || !date) return;

    setIsLoading(true);
    try {
      const qs = new URLSearchParams({
        date,
        user_id: String(user.user_id),
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/attendance?${qs.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to load attendance");

      const data = await res.json();
      const row = Array.isArray(data?.rows) ? data.rows[0] : data?.rows;

      if (!row) {
        // No existing record for that date: keep defaults but allow admin to create it
        setForm((p) => ({
          ...p,
          status: "present",
          check_in_time: "09:00",
          check_out_time: "18:00",
          notes: "",
        }));
        return;
      }

      setForm({
        status: row.status ?? "present",
        check_in_time: row.check_in_time ?? "",
        check_out_time: row.check_out_time ?? "",
        notes: row.notes ?? "",
      });
    } catch (e) {
      addToast({
        title: "Load Failed",
        description: e?.message || "Could not load existing attendance",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!canShow) return;
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canShow, user?.user_id, date]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!user?.user_id) return;

    setIsSaving(true);
    try {
      const payload = {
        tenant_id: curruser?.tenant_id,
        user_id: user.user_id,
        attendance_day: `${date}T00:00:00`,
        status: form.status,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        notes: form.notes || null,
        last_updated_by: curruser?.id ? parseInt(curruser.id) : 1,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save attendance");

      addToast({
        title: "Saved",
        description: "Attendance updated successfully",
        variant: "success",
      });

      onSaved?.(payload);
      onClose?.();
    } catch (e) {
      addToast({
        title: "Save Failed",
        description: e?.message || "Could not save attendance",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
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
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                This loads current attendance (if any). If none exists, it will create one on save.
              </div>
              <Button
                variant="outline"
                onClick={loadExisting}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Reload
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
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

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Add notes..."
                  className="border-[rgba(9,92,253,0.3)]"
                />
              </div>

              {/* Check in */}
              <div className="space-y-2">
                <Label>Check In</Label>
                <Input
                  type="time"
                  value={form.check_in_time || ""}
                  onChange={(e) => setField("check_in_time", e.target.value)}
                  className="border-[rgba(9,92,253,0.3)]"
                />
              </div>

              {/* Check out */}
              <div className="space-y-2">
                <Label>Check Out</Label>
                <Input
                  type="time"
                  value={form.check_out_time || ""}
                  onChange={(e) => setField("check_out_time", e.target.value)}
                  className="border-[rgba(9,92,253,0.3)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-[#095cfd] to-[#0b4dd5] text-white gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
