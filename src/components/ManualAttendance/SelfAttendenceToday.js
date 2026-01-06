"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  Loader2,
  RefreshCcw,
  Info
} from "lucide-react";

const pad2 = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const statusMeta = {
  present: { label: "Present", Icon: CheckCircle2, badge: "bg-green-100 text-green-700 border-green-200" },
  absent: { label: "Absent", Icon: XCircle, badge: "bg-red-100 text-red-700 border-red-200" },
  late: { label: "Late", Icon: AlertCircle, badge: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  half_day: { label: "Half Day", Icon: Clock, badge: "bg-orange-100 text-orange-800 border-orange-200" },
  leave: { label: "Leave", Icon: Calendar, badge: "bg-blue-100 text-blue-700 border-blue-200" },
  holiday: { label: "Holiday", Icon: Calendar, badge: "bg-slate-100 text-slate-700 border-slate-200" },
  weekend: { label: "Weekend", Icon: Calendar, badge: "bg-slate-100 text-slate-700 border-slate-200" }
};

function ProgressPill({ status }) {
  const pct = status === "present" ? 100 : status === "late" ? 70 : status === "half_day" ? 50 : 0;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>Today score</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[#095cfd]/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#095cfd] to-[#0b4dd5]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MyAttendanceToday({ curruser }) {
  const { addToast } = useToast();
  const todayYmd = useMemo(() => toYmd(new Date()), []);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        date: todayYmd,
        user_id: String(curruser?.id || "")
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/attendance?${qs.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error("Failed to load today attendance");
      const data = await res.json();

      const rows = Array.isArray(data?.rows) ? data.rows : [];
      setRow(rows[0] || null);
    } catch (e) {
      console.error(e);
      setRow(null);
      addToast({
        title: "Load Failed",
        description: e?.message || "Could not load today attendance",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusKey = String(row?.status || "").trim().toLowerCase();
  const meta = statusMeta[statusKey] || { label: "Not Submitted", Icon: Info, badge: "bg-slate-100 text-slate-700 border-slate-200" };
  const Icon = meta.Icon;

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-600 mt-1">Today: {todayYmd}</p>
        </div>

        <Button
          onClick={load}
          variant="outline"
          className="border-[#095cfd]/30 hover:bg-[#095cfd]/10"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="border-b border-[rgba(9,92,253,0.10)]">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="inline-flex h-9 w-9 rounded-xl bg-gradient-to-r from-[#095cfd] to-[#0b4dd5] items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </span>
              Attendance Summary
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-5">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading today attendance...
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Badge className={`border ${meta.badge}`}>{meta.label}</Badge>

                  {row ? (
                    <span className="text-xs text-muted-foreground">
                      Last updated by: {row?.last_updated_by ?? "N/A"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No submission found yet for today</span>
                  )}
                </div>

                <ProgressPill status={statusKey} />

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[#095cfd]/15 bg-gradient-to-r from-[#095cfd]/5 to-transparent p-4">
                    <div className="text-xs text-muted-foreground">Check-in</div>
                    <div className="text-lg font-semibold text-gray-900">{row?.check_in_time || "—"}</div>
                  </div>

                  <div className="rounded-xl border border-[#095cfd]/15 bg-gradient-to-r from-[#095cfd]/5 to-transparent p-4">
                    <div className="text-xs text-muted-foreground">Check-out</div>
                    <div className="text-lg font-semibold text-gray-900">{row?.check_out_time || "—"}</div>
                  </div>

                  <div className="md:col-span-2 rounded-xl border border-[#095cfd]/15 bg-gradient-to-r from-[#095cfd]/5 to-transparent p-4">
                    <div className="text-xs text-muted-foreground">Notes</div>
                    <div className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                      {row?.notes ? row.notes : "No notes"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardHeader className="border-b border-[rgba(9,92,253,0.10)]">
            <CardTitle className="text-lg">Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="font-semibold text-gray-900">{curruser?.name || "—"}</div>
            </div>

            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-semibold text-gray-900">{curruser?.email || "—"}</div>
            </div>

            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Role</div>
              <div className="font-semibold text-gray-900">{curruser?.role || "—"}</div>
            </div>

            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Tenant</div>
              <div className="font-semibold text-gray-900">{curruser?.tenant_name || "—"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
