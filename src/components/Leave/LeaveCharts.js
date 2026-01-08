// src/components/Leave/LeaveCharts.js
"use client";

import React, { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, AlertCircle, CheckCircle2, Calendar, XCircle } from "lucide-react";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const STATUS_META = {
  present: { label: "Present", icon: CheckCircle2 },
  leave: { label: "Leave", icon: Calendar },
  late: { label: "Late", icon: AlertCircle },
  half_day: { label: "Half Day", icon: Clock },
  absent: { label: "Absent", icon: XCircle }
};

const STATUS_ORDER = ["present", "leave", "late", "half_day", "absent"];

const STATUS_COLORS = {
  present: "#16a34a",
  leave: "#2563eb",
  late: "#ca8a04",
  half_day: "#ea580c",
  absent: "#dc2626"
};

const SOURCE_COLORS = {
  attendance: "#0ea5e9",
  activity: "#22c55e",
  default: "#94a3b8"
};

const niceNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

function Chip({ active, label, count, color, icon: Icon, onClick, title }) {
  const base = {
    borderColor: active ? `${color}` : "rgba(148,163,184,0.45)",
    background: active
      ? `linear-gradient(135deg, ${color}2A, ${color}14)`
      : "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.55))",
    boxShadow: active ? `0 10px 30px ${color}25` : "0 8px 20px rgba(2,6,23,0.08)"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title || "Click to filter"}
      style={base}
      className={[
        "group inline-flex items-center gap-2",
        "px-3 py-2",
        "rounded-xl",
        "border",
        "transition-all duration-200",
        "hover:-translate-y-[1px] hover:shadow-xl",
        "active:translate-y-0",
        "backdrop-blur-sm",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300"
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex items-center justify-center",
          "w-7 h-7 rounded-lg",
          "border",
          "transition-all duration-200"
        ].join(" ")}
        style={{
          borderColor: active ? `${color}AA` : "rgba(148,163,184,0.35)",
          background: active ? `${color}22` : "rgba(255,255,255,0.75)"
        }}
      >
        {Icon ? <Icon className="w-4 h-4" style={{ color: active ? color : `${color}CC` }} /> : null}
      </span>

      <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">{label}</span>

      <span
        className={[
          "ml-1 inline-flex items-center justify-center",
          "min-w-[34px] h-6 px-2",
          "rounded-lg text-xs font-bold",
          "transition-all duration-200",
          active ? "text-white" : "text-slate-700"
        ].join(" ")}
        style={{
          background: active ? color : "rgba(15,23,42,0.06)"
        }}
      >
        {count}
      </span>
    </button>
  );
}

export default function LeaveCharts({ summary, sourceSummary, selectedStatus = "all", onSelectStatus }) {
  const doughnutRef = useRef(null);
  const barRef = useRef(null);
  const sourceRef = useRef(null);

  const total = niceNum(summary?.total);

  const statusItems = useMemo(() => {
    const s = summary || {};
    return STATUS_ORDER.map((k) => ({
      key: k,
      label: STATUS_META[k].label,
      value: niceNum(s[k]),
      color: STATUS_COLORS[k]
    })).filter((x) => x.value > 0);
  }, [summary]);

  const statusBarItems = useMemo(() => {
    const s = summary || {};
    return STATUS_ORDER.map((k) => ({
      key: k,
      label: STATUS_META[k].label,
      value: niceNum(s[k]),
      color: STATUS_COLORS[k]
    }));
  }, [summary]);

  const sourceItems = useMemo(() => {
    const src = sourceSummary || {};
    return [
      { key: "attendance", label: "Attendance", value: niceNum(src.attendance), color: SOURCE_COLORS.attendance },
      { key: "activity", label: "Activity", value: niceNum(src.activity), color: SOURCE_COLORS.activity },
      { key: "default", label: "No data", value: niceNum(src.default), color: SOURCE_COLORS.default }
    ].filter((x) => x.value > 0);
  }, [sourceSummary]);

  const doughnutData = useMemo(
    () => ({
      labels: statusItems.map((x) => x.label),
      datasets: [
        {
          data: statusItems.map((x) => x.value),
          backgroundColor: statusItems.map((x) => x.color),
          borderWidth: 1,
          hoverOffset: 6
        }
      ]
    }),
    [statusItems]
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed ?? 0}` } }
      }
    }),
    []
  );

  const barData = useMemo(
    () => ({
      labels: statusBarItems.map((x) => x.label),
      datasets: [
        {
          label: "Count",
          data: statusBarItems.map((x) => x.value),
          backgroundColor: statusBarItems.map((x) => x.color),
          borderRadius: 10
        }
      ]
    }),
    [statusBarItems]
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `Count: ${ctx.parsed.y}` } }
      },
      scales: {
        x: { ticks: { maxRotation: 18, minRotation: 18 } },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }),
    []
  );

  const sourceData = useMemo(
    () => ({
      labels: sourceItems.map((x) => x.label),
      datasets: [
        {
          data: sourceItems.map((x) => x.value),
          backgroundColor: sourceItems.map((x) => x.color),
          borderWidth: 1,
          hoverOffset: 6
        }
      ]
    }),
    [sourceItems]
  );

  const sourceOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed ?? 0}` } }
      }
    }),
    []
  );

  // make all cards same height
  const CHART_H = 240;

  const handleStatusDoughnutClick = (evt) => {
    const chart = doughnutRef.current;
    if (!chart) return;
    const elements = chart.getElementsAtEventForMode(evt, "nearest", { intersect: true }, true);
    if (!elements?.length) return;
    const idx = elements[0].index;
    const item = statusItems[idx];
    if (!item?.key) return;
    onSelectStatus?.(selectedStatus === item.key ? "all" : item.key);
  };

  const handleBarClick = (evt) => {
    const chart = barRef.current;
    if (!chart) return;
    const elements = chart.getElementsAtEventForMode(evt, "nearest", { intersect: true }, true);
    if (!elements?.length) return;
    const idx = elements[0].index;
    const item = statusBarItems[idx];
    if (!item?.key) return;
    onSelectStatus?.(selectedStatus === item.key ? "all" : item.key);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
      {/* 1) Status doughnut + chips */}
      <Card className="h-full border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-[#095cfd]" />
            Status distribution
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            Total: <span className="font-semibold text-slate-900">{total}</span>
          </div>
        </CardHeader>

        <CardContent className="pt-2 flex flex-col gap-3">
          <div className="w-full" style={{ height: CHART_H }}>
            <Doughnut ref={doughnutRef} data={doughnutData} options={doughnutOptions} onClick={handleStatusDoughnutClick} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Chip
              active={selectedStatus === "all"}
              label="All"
              count={total}
              color="#0f172a"
              icon={Users}
              onClick={() => onSelectStatus?.("all")}
            />

            {STATUS_ORDER.map((k) => {
              const count = niceNum(summary?.[k]);
              if (!count) return null;
              const Icon = STATUS_META[k].icon;
              const active = selectedStatus === k;

              return (
                <Chip
                  key={k}
                  active={active}
                  label={STATUS_META[k].label}
                  count={count}
                  color={STATUS_COLORS[k]}
                  icon={Icon}
                  onClick={() => onSelectStatus?.(active ? "all" : k)}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2) Bar chart */}
      <Card className="h-full border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#095cfd]" />
            Counts by status
          </CardTitle>
          <div className="text-xs text-muted-foreground">Click bars to filter</div>
        </CardHeader>

        <CardContent className="pt-2 flex flex-col">
          <div className="w-full" style={{ height: CHART_H }}>
            <Bar ref={barRef} data={barData} options={barOptions} onClick={handleBarClick} />
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Selected:{" "}
            <span className="font-semibold text-slate-900">
              {selectedStatus === "all" ? "All" : STATUS_META[selectedStatus]?.label || selectedStatus}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3) Source mix doughnut */}
      <Card className="h-full border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#095cfd]" />
            Data source mix
          </CardTitle>
          <div className="text-xs text-muted-foreground">Where the day status came from</div>
        </CardHeader>

        <CardContent className="pt-2 flex flex-col gap-3">
          <div className="w-full" style={{ height: CHART_H }}>
            <Doughnut ref={sourceRef} data={sourceData} options={sourceOptions} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {sourceItems.map((s) => (
              <div
                key={s.key}
                className="rounded-xl border bg-white/80 px-3 py-2 transition hover:-translate-y-[1px] hover:shadow-lg"
                style={{ borderColor: `${s.color}55` }}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="font-semibold text-slate-800">{s.label}</span>
                </div>
                <div className="mt-1 text-slate-900 font-extrabold text-lg leading-none">{s.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
