"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  BarChart3,
  Clock,
  DollarSign,
  Layers,
  Table2,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

function fmtMoney(n) {
  const v = Number(n || 0);
  try {
    return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
  } catch {
    return `$${v.toFixed(2)}`;
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function safeDate(d, fallbackKey) {
  if (!d) return fallbackKey ? new Date(fallbackKey) : null;
  if (d instanceof Date) return d;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? (fallbackKey ? new Date(fallbackKey) : null) : x;
}

function toHours(seconds) {
  return (Number(seconds || 0) / 3600) || 0;
}

function pct(a, b) {
  const A = Number(a || 0);
  const B = Number(b || 0);
  if (!B) return 0;
  return (A / B) * 100;
}

function shortNum(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return `${v.toFixed(0)}`;
}

/* ---------- SVG Chart Helpers (no external deps) ---------- */
function scaleY(val, maxY, top, bottom) {
  const v = Number(val || 0);
  const m = Math.max(1e-9, Number(maxY || 1));
  const t = clamp(v / m, 0, 1);
  return bottom - t * (bottom - top);
}

function buildLinePath(xs, ys) {
  if (!xs?.length || !ys?.length || xs.length !== ys.length) return "";
  let d = "";
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d;
}

function buildAreaPath(xs, yTop, yBase) {
  if (!xs?.length || !yTop?.length || xs.length !== yTop.length) return "";
  const n = xs.length;
  let d = `M ${xs[0]} ${yBase} L ${xs[0]} ${yTop[0]}`;
  for (let i = 1; i < n; i++) d += ` L ${xs[i]} ${yTop[i]}`;
  d += ` L ${xs[n - 1]} ${yBase} Z`;
  return d;
}

function buildBetweenAreaPath(xs, yUpper, yLower) {
  if (!xs?.length || !yUpper?.length || !yLower?.length) return "";
  if (xs.length !== yUpper.length || xs.length !== yLower.length) return "";
  const n = xs.length;

  // go along upper, then back along lower
  let d = `M ${xs[0]} ${yLower[0]} L ${xs[0]} ${yUpper[0]}`;
  for (let i = 1; i < n; i++) d += ` L ${xs[i]} ${yUpper[i]}`;
  for (let i = n - 1; i >= 0; i--) d += ` L ${xs[i]} ${yLower[i]}`;
  d += " Z";
  return d;
}

/* ---------- Donut ---------- */
function donutArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
  // angles in radians
  const large = endAngle - startAngle > Math.PI ? 1 : 0;

  const sxO = cx + rOuter * Math.cos(startAngle);
  const syO = cy + rOuter * Math.sin(startAngle);
  const exO = cx + rOuter * Math.cos(endAngle);
  const eyO = cy + rOuter * Math.sin(endAngle);

  const sxI = cx + rInner * Math.cos(endAngle);
  const syI = cy + rInner * Math.sin(endAngle);
  const exI = cx + rInner * Math.cos(startAngle);
  const eyI = cy + rInner * Math.sin(startAngle);

  return [
    `M ${sxO} ${syO}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${exO} ${eyO}`,
    `L ${sxI} ${syI}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${exI} ${eyI}`,
    "Z",
  ].join(" ");
}

export default function TimeSheetApproveModal({
  open,
  onClose,
  onApprove,
  onReject,
  loading = false,

  tzLabel = "Asia/Dhaka",
  rangeLabel = "",

  freelancer = { id: null, name: "User", role: "freelancer" },

  summary = {
    days: 0,
    sessions: 0,
    total_active_seconds: 0,
    total_raw_seconds: 0,
    total_idle_seconds: 0,
    total_payment_all: 0,
    total_payment_payable: 0,
    payable_sessions: 0,
  },

  // series: [{ dateKey, dateObj, activeSeconds, rawSeconds, idleSeconds, paymentAll, paymentPayable, sessions, payableSessions }]
  series = [],

  // projects: [{ project_id, project_name, activeSeconds, rawSeconds, idleSeconds, paymentPayable, sessions }]
  projects = [],
}) {
  const [tab, setTab] = useState("overview"); // overview | trends | projects | days
  const [hoverH, setHoverH] = useState(null); // { idx, x, y }
  const [hoverP, setHoverP] = useState(null); // { idx, x, y }
  const [sort, setSort] = useState({ key: "date", dir: "asc" }); // days table sort
  const [pinnedIdx, setPinnedIdx] = useState(null);

  const normalized = useMemo(() => {
    const s = Array.isArray(series) ? [...series] : [];
    // stable sort by dateKey / dateObj
    s.sort((a, b) => {
      const da = safeDate(a?.dateObj, a?.dateKey);
      const db = safeDate(b?.dateObj, b?.dateKey);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return ta - tb;
    });

    const withDates = s.map((d) => {
      const dateObj = safeDate(d?.dateObj, d?.dateKey);
      const dateKey = d?.dateKey || (dateObj ? format(dateObj, "yyyy-MM-dd") : "");
      return { ...d, dateObj, dateKey };
    });

    return withDates;
  }, [series]);

  const totals = useMemo(() => {
    const totalActiveH = toHours(summary.total_active_seconds);
    const totalRawH = toHours(summary.total_raw_seconds);
    const totalIdleH = toHours(summary.total_idle_seconds);

    const payable = Number(summary.total_payment_payable || 0);
    const totalAll = Number(summary.total_payment_all || 0);

    const activePct = pct(totalActiveH, totalRawH);
    const idlePct = pct(totalIdleH, totalRawH);

    return {
      totalActiveH,
      totalRawH,
      totalIdleH,
      payable,
      totalAll,
      activePct,
      idlePct,
    };
  }, [summary]);

  const charts = useMemo(() => {
    const activeH = normalized.map((d) => toHours(d.activeSeconds));
    const idleH = normalized.map((d) => toHours(d.idleSeconds));
    const rawH = normalized.map((d) => toHours(d.rawSeconds));
    const pay = normalized.map((d) => Number(d.paymentPayable || 0));

    const maxH = Math.max(1, ...rawH);
    const maxPay = Math.max(1, ...pay);

    return { activeH, idleH, rawH, pay, maxH, maxPay };
  }, [normalized]);

  const toggleSort = useCallback((key) => {
    setSort((s) => {
      if (s.key === key) {
        return { key, dir: s.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  }, []);

  const sortedDays = useMemo(() => {
    const arr = [...normalized];
    const dir = sort.dir === "asc" ? 1 : -1;

    const val = (d) => {
      switch (sort.key) {
        case "date":
          return d?.dateObj ? d.dateObj.getTime() : 0;
        case "raw":
          return Number(d.rawSeconds || 0);
        case "active":
          return Number(d.activeSeconds || 0);
        case "idle":
          return Number(d.idleSeconds || 0);
        case "sessions":
          return Number(d.sessions || 0);
        case "payable":
          return Number(d.paymentPayable || 0);
        default:
          return d?.dateObj ? d.dateObj.getTime() : 0;
      }
    };

    arr.sort((a, b) => {
      const A = val(a);
      const B = val(b);
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });
    return arr;
  }, [normalized, sort]);

  const topProjects = useMemo(() => {
    const p = Array.isArray(projects) ? [...projects] : [];
    p.sort((a, b) => Number(b.paymentPayable || 0) - Number(a.paymentPayable || 0));
    return p;
  }, [projects]);

  const projectMaxPay = useMemo(() => {
    return Math.max(1, ...topProjects.map((p) => Number(p.paymentPayable || 0)));
  }, [topProjects]);

  const onHoursMove = useCallback(
    (e) => {
      if (!normalized.length) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;

      const W = 560;
      const padL = 24;
      const padR = 14;
      const plotW = W - padL - padR;

      const t = clamp((x - (rect.width * (padL / W))) / (rect.width * (plotW / W)), 0, 1);
      const idx = clamp(Math.round(t * (normalized.length - 1)), 0, normalized.length - 1);

      setHoverH({ idx, x: e.clientX, y: e.clientY });
    },
    [normalized]
  );

  const onPayMove = useCallback(
    (e) => {
      if (!normalized.length) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;

      const W = 560;
      const padL = 24;
      const padR = 14;
      const plotW = W - padL - padR;

      const t = clamp((x - (rect.width * (padL / W))) / (rect.width * (plotW / W)), 0, 1);
      const idx = clamp(Math.round(t * (normalized.length - 1)), 0, normalized.length - 1);

      setHoverP({ idx, x: e.clientX, y: e.clientY });
    },
    [normalized]
  );

  // Tooltip data
  const hoverHoursRow = hoverH?.idx != null ? normalized[hoverH.idx] : null;
  const hoverPayRow = hoverP?.idx != null ? normalized[hoverP.idx] : null;
  const pinnedRow = pinnedIdx != null ? sortedDays[pinnedIdx] : null;

  // Donut calc (Active vs Idle vs Untracked gap if any)
  const donut = useMemo(() => {
    const raw = Math.max(0, totals.totalRawH);
    const active = Math.max(0, totals.totalActiveH);
    const idle = Math.max(0, totals.totalIdleH);
    const gap = Math.max(0, raw - active - idle); 

    const sum = Math.max(1e-9, active + idle + gap);

    const parts = [
      { key: "active", value: active, colorClass: "fill-indigo-600" },
      { key: "idle", value: idle, colorClass: "fill-rose-500" },
      { key: "gap", value: gap, colorClass: "fill-neutral-300" },
    ];

    let angle = -Math.PI / 2; // start at top
    const arcs = parts
      .filter((p) => p.value > 0)
      .map((p) => {
        const slice = (p.value / sum) * Math.PI * 2;
        const start = angle;
        const end = angle + slice;
        angle = end;
        return { ...p, start, end };
      });

    return { arcs, sum, active, idle, gap, raw };
  }, [totals]);

  // Build SVG paths for stacked area (Active + Idle = Raw)
  const hoursSvg = useMemo(() => {
    const n = normalized.length;
    const W = 560;
    const H = 160;
    const padL = 24;
    const padR = 14;
    const padT = 12;
    const padB = 18;

    const plotL = padL;
    const plotR = W - padR;
    const plotT = padT;
    const plotB = H - padB;

    const xs = [];
    const yActive = [];
    const yRaw = [];
    const yBase = plotB;

    if (n === 0) {
      return { W, H, xs, yActive, yRaw, yBase, plotL, plotR, plotT, plotB, pathActive: "", pathIdle: "", lineRaw: "" };
    }

    const dx = n === 1 ? 0 : (plotR - plotL) / (n - 1);

    for (let i = 0; i < n; i++) {
      const x = plotL + i * dx;
      const a = charts.activeH[i] || 0;
      const r = charts.rawH[i] || Math.max(0, a + (charts.idleH[i] || 0));
      const yA = scaleY(a, charts.maxH, plotT, plotB);
      const yR = scaleY(r, charts.maxH, plotT, plotB);

      xs.push(x);
      yActive.push(yA);
      yRaw.push(yR);
    }

    const pathActive = buildAreaPath(xs, yActive, yBase);
    const pathIdle = buildBetweenAreaPath(xs, yRaw, yActive);
    const lineRaw = buildLinePath(xs, yRaw);
    const lineActive = buildLinePath(xs, yActive);

    return {
      W,
      H,
      xs,
      yActive,
      yRaw,
      yBase,
      plotL,
      plotR,
      plotT,
      plotB,
      pathActive,
      pathIdle,
      lineRaw,
      lineActive,
    };
  }, [normalized, charts]);

  // Payment lollipop chart
  const paySvg = useMemo(() => {
    const n = normalized.length;
    const W = 560;
    const H = 160;
    const padL = 24;
    const padR = 14;
    const padT = 12;
    const padB = 18;

    const plotL = padL;
    const plotR = W - padR;
    const plotT = padT;
    const plotB = H - padB;

    const xs = [];
    const ys = [];

    if (n === 0) return { W, H, plotL, plotR, plotT, plotB, xs, ys };

    const dx = n === 1 ? 0 : (plotR - plotL) / (n - 1);

    for (let i = 0; i < n; i++) {
      const x = plotL + i * dx;
      const v = charts.pay[i] || 0;
      const y = scaleY(v, charts.maxPay, plotT, plotB);
      xs.push(x);
      ys.push(y);
    }

    const line = buildLinePath(xs, ys);

    return { W, H, plotL, plotR, plotT, plotB, xs, ys, line };
  }, [normalized, charts]);

  const SortTh = ({ label, k }) => {
    const active = sort.key === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 text-left hover:text-neutral-900 ${
          active ? "text-neutral-900" : "text-neutral-600"
        }`}
        title="Sort"
      >
        {label}
        <ArrowUpDown className={`h-3.5 w-3.5 ${active ? "opacity-90" : "opacity-40"}`} />
      </button>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={loading ? undefined : onClose}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
        <div className="w-full max-w-6xl rounded-2xl border bg-white shadow-xl overflow-hidden">
          {/* header */}
          <div className="flex items-start justify-between gap-3 p-5 border-b bg-gradient-to-r from-indigo-50 to-blue-50">
            <div>
              <div className="text-xs font-semibold text-indigo-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Approve Timesheet (Interactive Preview)
              </div>

              <h2 className="text-xl md:text-2xl font-semibold text-neutral-900">
                {freelancer?.name || "Freelancer"}{" "}
                <span className="text-sm font-medium text-neutral-500">(#{freelancer?.id ?? "—"})</span>
              </h2>

              <div className="mt-1 text-sm text-neutral-600">
                {rangeLabel ? `${rangeLabel} • ` : ""}
                TZ: {tzLabel}
              </div>
            </div>

            <button
              onClick={loading ? undefined : onClose}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border bg-white hover:bg-neutral-50"
              aria-label="Close"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* tabs */}
          <div className="px-5 md:px-6 pt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTab("overview")}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                  tab === "overview"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setTab("trends")}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition inline-flex items-center gap-2 ${
                  tab === "trends"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                <Layers className="h-4 w-4" />
                Trends
              </button>
              <button
                onClick={() => setTab("projects")}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition inline-flex items-center gap-2 ${
                  tab === "projects"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Projects
              </button>
              <button
                onClick={() => setTab("days")}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition inline-flex items-center gap-2 ${
                  tab === "days"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                <Table2 className="h-4 w-4" />
                Days
              </button>
            </div>
          </div>

          {/* body */}
          <div className="p-5 md:p-6">
            {/* OVERVIEW */}
            {tab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* left */}
                <div className="lg:col-span-1 space-y-3">
                  {/* donut summary */}
                  <div className="rounded-2xl border p-4 bg-gradient-to-br from-white to-neutral-50">
                    <div className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      Time Composition (RAW)
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <div className="relative">
                        <svg viewBox="0 0 120 120" className="h-28 w-28">
                          <defs>
                            <linearGradient id="donutActive" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0" stopColor="rgb(79 70 229)" stopOpacity="1" />
                              <stop offset="1" stopColor="rgb(37 99 235)" stopOpacity="1" />
                            </linearGradient>
                            <linearGradient id="donutIdle" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0" stopColor="rgb(244 63 94)" stopOpacity="1" />
                              <stop offset="1" stopColor="rgb(239 68 68)" stopOpacity="1" />
                            </linearGradient>
                          </defs>

                          {/* base ring */}
                          <circle cx="60" cy="60" r="46" className="fill-none stroke-neutral-200" strokeWidth="16" />

                          {/* arcs */}
                          {donut.arcs.map((a) => {
                            const path = donutArc(60, 60, 54, 38, a.start, a.end);
                            const fill =
                              a.key === "active"
                                ? "url(#donutActive)"
                                : a.key === "idle"
                                ? "url(#donutIdle)"
                                : "rgb(212 212 212)";
                            return (
                              <path
                                key={a.key}
                                d={path}
                                fill={fill}
                                opacity={a.key === "gap" ? 0.75 : 1}
                              />
                            );
                          })}

                          {/* center */}
                          <circle cx="60" cy="60" r="30" className="fill-white" />
                          <text
                            x="60"
                            y="56"
                            textAnchor="middle"
                            className="fill-neutral-900"
                            fontSize="12"
                            fontWeight="700"
                          >
                            {totals.totalRawH.toFixed(1)}h
                          </text>
                          <text
                            x="60"
                            y="72"
                            textAnchor="middle"
                            className="fill-neutral-500"
                            fontSize="10"
                            fontWeight="600"
                          >
                            RAW
                          </text>
                        </svg>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-2 text-neutral-700">
                            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                            Active
                          </span>
                          <span className="font-semibold text-neutral-900">
                            {totals.totalActiveH.toFixed(2)}h{" "}
                            <span className="text-xs text-neutral-500">
                              ({totals.activePct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-2 text-neutral-700">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                            Idle
                          </span>
                          <span className="font-semibold text-neutral-900">
                            {totals.totalIdleH.toFixed(2)}h{" "}
                            <span className="text-xs text-neutral-500">({totals.idlePct.toFixed(0)}%)</span>
                          </span>
                        </div>

                        <div className="mt-2 rounded-lg border bg-white p-3">
                          <div className="text-xs text-neutral-500">Days / Sessions</div>
                          <div className="mt-1 flex items-center justify-between">
                            <div className="text-lg font-semibold">{summary.days || 0} days</div>
                            <div className="text-lg font-semibold">{summary.sessions || 0} sessions</div>
                          </div>
                          <div className="mt-1 text-xs text-neutral-500">
                            Payable sessions: <span className="font-semibold text-neutral-700">{summary.payable_sessions || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* payment summary */}
                  <div className="rounded-2xl border p-4 bg-gradient-to-br from-white to-emerald-50/40">
                    <div className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Payment Summary
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-[11px] text-neutral-500">Payable now (flagger=0)</div>
                        <div className="text-lg font-semibold text-emerald-700">
                          {fmtMoney(summary.total_payment_payable || 0)}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-1">
                          Sessions: {summary.payable_sessions || 0}
                        </div>
                      </div>

                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-[11px] text-neutral-500">Total in range (all)</div>
                        <div className="text-lg font-semibold">{fmtMoney(summary.total_payment_all || 0)}</div>
                        <div className="text-[11px] text-neutral-500 mt-1">(includes processed too)</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-[11px] text-neutral-500">Payable share</div>
                      <div className="mt-1 h-2.5 rounded-full bg-neutral-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${clamp(pct(summary.total_payment_payable, summary.total_payment_all), 0, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        {clamp(pct(summary.total_payment_payable, summary.total_payment_all), 0, 100).toFixed(0)}% of total
                      </div>
                    </div>
                  </div>
                </div>

                {/* right */}
                <div className="lg:col-span-2 space-y-4">
                  {/* stacked area preview */}
                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-neutral-800">Activity Flow (Stacked Area)</div>
                      <div className="text-xs text-neutral-500">Hover to inspect • RAW = Active + Idle</div>
                    </div>

                    <div className="mt-3 rounded-xl border bg-white p-3 relative">
                      <svg
                        viewBox={`0 0 ${hoursSvg.W} ${hoursSvg.H}`}
                        className="w-full h-36"
                        onMouseMove={onHoursMove}
                        onMouseLeave={() => setHoverH(null)}
                      >
                        <defs>
                          <linearGradient id="gradActive" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="rgb(79 70 229)" stopOpacity="0.25" />
                            <stop offset="1" stopColor="rgb(37 99 235)" stopOpacity="0.12" />
                          </linearGradient>
                          <linearGradient id="gradIdle" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="rgb(244 63 94)" stopOpacity="0.18" />
                            <stop offset="1" stopColor="rgb(239 68 68)" stopOpacity="0.10" />
                          </linearGradient>
                          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.18)" />
                          </filter>
                        </defs>

                        {/* grid */}
                        {[0.25, 0.5, 0.75].map((t, idx) => {
                          const y = hoursSvg.plotB - t * (hoursSvg.plotB - hoursSvg.plotT);
                          return (
                            <line
                              key={idx}
                              x1={hoursSvg.plotL}
                              y1={y}
                              x2={hoursSvg.plotR}
                              y2={y}
                              stroke="currentColor"
                              strokeOpacity="0.08"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {/* idle area between active and raw */}
                        <path d={hoursSvg.pathIdle} fill="url(#gradIdle)" />

                        {/* active area */}
                        <path d={hoursSvg.pathActive} fill="url(#gradActive)" />

                        {/* lines */}
                        <path d={hoursSvg.lineRaw} fill="none" stroke="rgb(17 24 39)" strokeOpacity="0.18" strokeWidth="2" />
                        <path d={hoursSvg.lineActive} fill="none" stroke="rgb(79 70 229)" strokeOpacity="0.9" strokeWidth="2.5" />

                        {/* hover crosshair */}
                        {hoverHoursRow && hoursSvg.xs?.[hoverH.idx] != null && (
                          <>
                            <line
                              x1={hoursSvg.xs[hoverH.idx]}
                              y1={hoursSvg.plotT}
                              x2={hoursSvg.xs[hoverH.idx]}
                              y2={hoursSvg.plotB}
                              stroke="rgb(99 102 241)"
                              strokeOpacity="0.35"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <circle
                              cx={hoursSvg.xs[hoverH.idx]}
                              cy={hoursSvg.yActive[hoverH.idx]}
                              r="4.5"
                              fill="rgb(79 70 229)"
                              filter="url(#softShadow)"
                            />
                            <circle
                              cx={hoursSvg.xs[hoverH.idx]}
                              cy={hoursSvg.yRaw[hoverH.idx]}
                              r="4"
                              fill="rgb(17 24 39)"
                              opacity="0.35"
                            />
                          </>
                        )}
                      </svg>

                      <div className="mt-2 flex items-center gap-4 text-xs text-neutral-600">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Active (filled)
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Idle (stacked)
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-neutral-500/40" /> Raw boundary
                        </span>
                      </div>

                      {/* tooltip */}
                      {hoverHoursRow && (
                        <div className="absolute right-3 top-3 rounded-xl border bg-white shadow-lg p-3 text-xs">
                          <div className="font-semibold text-neutral-900">
                            {hoverHoursRow?.dateObj
                              ? format(hoverHoursRow.dateObj, "MMM d, yyyy", { locale: enUS })
                              : hoverHoursRow?.dateKey}
                          </div>
                          <div className="mt-1 text-neutral-600">
                            RAW: <span className="font-semibold text-neutral-900">{toHours(hoverHoursRow.rawSeconds).toFixed(2)}h</span>
                          </div>
                          <div className="text-neutral-600">
                            ACTIVE:{" "}
                            <span className="font-semibold text-indigo-700">{toHours(hoverHoursRow.activeSeconds).toFixed(2)}h</span>
                          </div>
                          <div className="text-neutral-600">
                            IDLE: <span className="font-semibold text-rose-600">{toHours(hoverHoursRow.idleSeconds).toFixed(2)}h</span>
                          </div>
                          <div className="mt-1 text-neutral-500">
                            Sessions:{" "}
                            <span className="font-semibold text-neutral-700">{hoverHoursRow.sessions || 0}</span>{" "}
                            (payable:{" "}
                            <span className="font-semibold text-emerald-700">{hoverHoursRow.payableSessions || 0}</span>)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* payment lollipop */}
                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-neutral-800">Payable Pulse (Lollipop + Line)</div>
                      <div className="text-xs text-neutral-500">Hover to inspect • scaled to max</div>
                    </div>

                    <div className="mt-3 rounded-xl border bg-white p-3 relative">
                      <svg
                        viewBox={`0 0 ${paySvg.W} ${paySvg.H}`}
                        className="w-full h-36"
                        onMouseMove={onPayMove}
                        onMouseLeave={() => setHoverP(null)}
                      >
                        <defs>
                          <linearGradient id="payLine" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0" stopColor="rgb(16 185 129)" stopOpacity="0.85" />
                            <stop offset="1" stopColor="rgb(34 197 94)" stopOpacity="0.85" />
                          </linearGradient>
                          <linearGradient id="payStick" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="rgb(16 185 129)" stopOpacity="0.70" />
                            <stop offset="1" stopColor="rgb(16 185 129)" stopOpacity="0.12" />
                          </linearGradient>
                        </defs>

                        {/* grid */}
                        {[0.25, 0.5, 0.75].map((t, idx) => {
                          const y = paySvg.plotB - t * (paySvg.plotB - paySvg.plotT);
                          return (
                            <line
                              key={idx}
                              x1={paySvg.plotL}
                              y1={y}
                              x2={paySvg.plotR}
                              y2={y}
                              stroke="currentColor"
                              strokeOpacity="0.08"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {/* sticks + dots */}
                        {paySvg.xs.map((x, i) => {
                          const y = paySvg.ys[i];
                          const base = paySvg.plotB;
                          return (
                            <g key={i}>
                              <line x1={x} y1={base} x2={x} y2={y} stroke="url(#payStick)" strokeWidth="6" strokeLinecap="round" />
                              <circle cx={x} cy={y} r="5.5" fill="rgb(16 185 129)" opacity="0.9" />
                              <circle cx={x} cy={y} r="10" fill="transparent" />
                            </g>
                          );
                        })}

                        {/* line overlay */}
                        <path d={paySvg.line} fill="none" stroke="url(#payLine)" strokeWidth="2.5" />

                        {/* hover crosshair */}
                        {hoverPayRow && paySvg.xs?.[hoverP.idx] != null && (
                          <>
                            <line
                              x1={paySvg.xs[hoverP.idx]}
                              y1={paySvg.plotT}
                              x2={paySvg.xs[hoverP.idx]}
                              y2={paySvg.plotB}
                              stroke="rgb(16 185 129)"
                              strokeOpacity="0.30"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <circle cx={paySvg.xs[hoverP.idx]} cy={paySvg.ys[hoverP.idx]} r="7" fill="rgb(16 185 129)" opacity="0.25" />
                          </>
                        )}
                      </svg>

                      {/* tooltip */}
                      {hoverPayRow && (
                        <div className="absolute right-3 top-3 rounded-xl border bg-white shadow-lg p-3 text-xs">
                          <div className="font-semibold text-neutral-900">
                            {hoverPayRow?.dateObj
                              ? format(hoverPayRow.dateObj, "MMM d, yyyy", { locale: enUS })
                              : hoverPayRow?.dateKey}
                          </div>
                          <div className="mt-1 text-neutral-600">
                            Payable:{" "}
                            <span className="font-semibold text-emerald-700">
                              {fmtMoney(hoverPayRow.paymentPayable || 0)}
                            </span>
                          </div>
                          <div className="text-neutral-500">
                            Sessions:{" "}
                            <span className="font-semibold text-neutral-700">{hoverPayRow.sessions || 0}</span>{" "}
                            (payable:{" "}
                            <span className="font-semibold text-emerald-700">{hoverPayRow.payableSessions || 0}</span>)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TRENDS */}
            {tab === "trends" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* left mini cards */}
                <div className="lg:col-span-1 space-y-3">
                  <div className="rounded-2xl border p-4">
                    <div className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      Quick Stats
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-[11px] text-neutral-500">AVG Active / Day</div>
                        <div className="text-lg font-semibold">
                          {normalized.length ? (totals.totalActiveH / normalized.length).toFixed(2) : "0.00"}h
                        </div>
                      </div>

                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-[11px] text-neutral-500">AVG Idle / Day</div>
                        <div className="text-lg font-semibold">
                          {normalized.length ? (totals.totalIdleH / normalized.length).toFixed(2) : "0.00"}h
                        </div>
                      </div>

                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-[11px] text-neutral-500">Max Payable / Day</div>
                        <div className="text-lg font-semibold text-emerald-700">
                          {fmtMoney(Math.max(0, ...charts.pay))}
                        </div>
                      </div>

                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-[11px] text-neutral-500">Max RAW / Day</div>
                        <div className="text-lg font-semibold">
                          {Math.max(0, ...charts.rawH).toFixed(2)}h
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 bg-gradient-to-br from-white to-indigo-50/60">
                    <div className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      What to look at
                    </div>
                    <ul className="mt-2 text-sm text-neutral-600 space-y-1 list-disc pl-5">
                      <li>Spikes in RAW with low ACTIVE usually indicate long idle periods.</li>
                      <li>Payable spikes should align with days having higher ACTIVE (flagger=0).</li>
                      <li>If many days have sessions but payable is low, items may already be processed.</li>
                    </ul>
                  </div>
                </div>

                {/* right charts */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-neutral-800">Activity Flow (Stacked Area)</div>
                      <div className="text-xs text-neutral-500">Hover to inspect</div>
                    </div>
                    <div className="mt-3 rounded-xl border bg-white p-3">
                      {/* reuse overview chart */}
                      <div className="relative">
                        <svg
                          viewBox={`0 0 ${hoursSvg.W} ${hoursSvg.H}`}
                          className="w-full h-44"
                          onMouseMove={onHoursMove}
                          onMouseLeave={() => setHoverH(null)}
                        >
                          <defs>
                            <linearGradient id="gradActive2" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0" stopColor="rgb(79 70 229)" stopOpacity="0.25" />
                              <stop offset="1" stopColor="rgb(37 99 235)" stopOpacity="0.12" />
                            </linearGradient>
                            <linearGradient id="gradIdle2" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0" stopColor="rgb(244 63 94)" stopOpacity="0.18" />
                              <stop offset="1" stopColor="rgb(239 68 68)" stopOpacity="0.10" />
                            </linearGradient>
                          </defs>

                          {[0.25, 0.5, 0.75].map((t, idx) => {
                            const y = hoursSvg.plotB - t * (hoursSvg.plotB - hoursSvg.plotT);
                            return (
                              <line
                                key={idx}
                                x1={hoursSvg.plotL}
                                y1={y}
                                x2={hoursSvg.plotR}
                                y2={y}
                                stroke="currentColor"
                                strokeOpacity="0.08"
                                strokeWidth="1"
                              />
                            );
                          })}

                          <path d={hoursSvg.pathIdle} fill="url(#gradIdle2)" />
                          <path d={hoursSvg.pathActive} fill="url(#gradActive2)" />

                          <path d={hoursSvg.lineRaw} fill="none" stroke="rgb(17 24 39)" strokeOpacity="0.18" strokeWidth="2" />
                          <path d={hoursSvg.lineActive} fill="none" stroke="rgb(79 70 229)" strokeOpacity="0.9" strokeWidth="2.5" />

                          {hoverHoursRow && hoursSvg.xs?.[hoverH.idx] != null && (
                            <>
                              <line
                                x1={hoursSvg.xs[hoverH.idx]}
                                y1={hoursSvg.plotT}
                                x2={hoursSvg.xs[hoverH.idx]}
                                y2={hoursSvg.plotB}
                                stroke="rgb(99 102 241)"
                                strokeOpacity="0.35"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                              />
                              <circle cx={hoursSvg.xs[hoverH.idx]} cy={hoursSvg.yActive[hoverH.idx]} r="5" fill="rgb(79 70 229)" />
                              <circle cx={hoursSvg.xs[hoverH.idx]} cy={hoursSvg.yRaw[hoverH.idx]} r="4" fill="rgb(17 24 39)" opacity="0.35" />
                            </>
                          )}
                        </svg>

                        {hoverHoursRow && (
                          <div className="absolute right-3 top-3 rounded-xl border bg-white shadow-lg p-3 text-xs">
                            <div className="font-semibold text-neutral-900">
                              {hoverHoursRow?.dateObj
                                ? format(hoverHoursRow.dateObj, "MMM d, yyyy", { locale: enUS })
                                : hoverHoursRow?.dateKey}
                            </div>
                            <div className="mt-1 text-neutral-600">
                              RAW: <span className="font-semibold text-neutral-900">{toHours(hoverHoursRow.rawSeconds).toFixed(2)}h</span>
                            </div>
                            <div className="text-neutral-600">
                              ACTIVE:{" "}
                              <span className="font-semibold text-indigo-700">{toHours(hoverHoursRow.activeSeconds).toFixed(2)}h</span>
                            </div>
                            <div className="text-neutral-600">
                              IDLE: <span className="font-semibold text-rose-600">{toHours(hoverHoursRow.idleSeconds).toFixed(2)}h</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-neutral-800">Payable Pulse (Lollipop + Line)</div>
                      <div className="text-xs text-neutral-500">Hover to inspect</div>
                    </div>
                    <div className="mt-3 rounded-xl border bg-white p-3 relative">
                      <svg
                        viewBox={`0 0 ${paySvg.W} ${paySvg.H}`}
                        className="w-full h-44"
                        onMouseMove={onPayMove}
                        onMouseLeave={() => setHoverP(null)}
                      >
                        <defs>
                          <linearGradient id="payLine2" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0" stopColor="rgb(16 185 129)" stopOpacity="0.85" />
                            <stop offset="1" stopColor="rgb(34 197 94)" stopOpacity="0.85" />
                          </linearGradient>
                          <linearGradient id="payStick2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="rgb(16 185 129)" stopOpacity="0.70" />
                            <stop offset="1" stopColor="rgb(16 185 129)" stopOpacity="0.10" />
                          </linearGradient>
                        </defs>

                        {[0.25, 0.5, 0.75].map((t, idx) => {
                          const y = paySvg.plotB - t * (paySvg.plotB - paySvg.plotT);
                          return (
                            <line
                              key={idx}
                              x1={paySvg.plotL}
                              y1={y}
                              x2={paySvg.plotR}
                              y2={y}
                              stroke="currentColor"
                              strokeOpacity="0.08"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {paySvg.xs.map((x, i) => {
                          const y = paySvg.ys[i];
                          const base = paySvg.plotB;
                          return (
                            <g key={i}>
                              <line x1={x} y1={base} x2={x} y2={y} stroke="url(#payStick2)" strokeWidth="7" strokeLinecap="round" />
                              <circle cx={x} cy={y} r="6" fill="rgb(16 185 129)" opacity="0.9" />
                              <circle cx={x} cy={y} r="11" fill="transparent" />
                            </g>
                          );
                        })}

                        <path d={paySvg.line} fill="none" stroke="url(#payLine2)" strokeWidth="2.5" />

                        {hoverPayRow && paySvg.xs?.[hoverP.idx] != null && (
                          <>
                            <line
                              x1={paySvg.xs[hoverP.idx]}
                              y1={paySvg.plotT}
                              x2={paySvg.xs[hoverP.idx]}
                              y2={paySvg.plotB}
                              stroke="rgb(16 185 129)"
                              strokeOpacity="0.30"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <circle cx={paySvg.xs[hoverP.idx]} cy={paySvg.ys[hoverP.idx]} r="7.5" fill="rgb(16 185 129)" opacity="0.25" />
                          </>
                        )}
                      </svg>

                      {hoverPayRow && (
                        <div className="absolute right-3 top-3 rounded-xl border bg-white shadow-lg p-3 text-xs">
                          <div className="font-semibold text-neutral-900">
                            {hoverPayRow?.dateObj
                              ? format(hoverPayRow.dateObj, "MMM d, yyyy", { locale: enUS })
                              : hoverPayRow?.dateKey}
                          </div>
                          <div className="mt-1 text-neutral-600">
                            Payable:{" "}
                            <span className="font-semibold text-emerald-700">{fmtMoney(hoverPayRow.paymentPayable || 0)}</span>
                          </div>
                          <div className="text-neutral-500">
                            Sessions: <span className="font-semibold text-neutral-700">{hoverPayRow.sessions || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PROJECTS */}
            {tab === "projects" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 space-y-3">
                  <div className="rounded-2xl border p-4">
                    <div className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-indigo-600" />
                      Projects (Payable Leaderboard)
                    </div>
                    <div className="mt-2 text-sm text-neutral-600">
                      Bars are interactive: hover to see exact payment + time.
                    </div>

                    <div className="mt-3 rounded-xl border bg-white p-3">
                      <div className="text-xs text-neutral-500">Total payable</div>
                      <div className="mt-1 text-2xl font-semibold text-emerald-700">
                        {fmtMoney(summary.total_payment_payable || 0)}
                      </div>
                      <div className="mt-2 text-xs text-neutral-500">
                        Projects: <span className="font-semibold text-neutral-700">{topProjects.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-neutral-800">Top Projects (Payable)</div>
                      <div className="text-xs text-neutral-500">Scaled to top project</div>
                    </div>

                    <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
                      {topProjects.length ? (
                        topProjects.map((p) => {
                          const pay = Number(p.paymentPayable || 0);
                          const activeH = toHours(p.activeSeconds);
                          const idleH = toHours(p.idleSeconds);
                          const w = clamp((pay / projectMaxPay) * 100, 0, 100);

                          return (
                            <div
                              key={String(p.project_id)}
                              className="rounded-xl border bg-white p-3 hover:shadow-md transition relative group"
                              title="Hover for details"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-neutral-900 truncate">
                                    {p.project_name || `Project ${p.project_id}`}
                                  </div>
                                  <div className="mt-1 text-xs text-neutral-500">
                                    Active: <span className="font-semibold text-neutral-700">{activeH.toFixed(2)}h</span>{" "}
                                    • Idle: <span className="font-semibold text-neutral-700">{idleH.toFixed(2)}h</span>{" "}
                                    • Sessions: <span className="font-semibold text-neutral-700">{p.sessions || 0}</span>
                                  </div>
                                </div>

                                <div className="text-sm font-semibold text-emerald-700 whitespace-nowrap">
                                  {fmtMoney(pay)}
                                </div>
                              </div>

                              <div className="mt-3 h-2.5 rounded-full bg-neutral-200 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-700"
                                  style={{ width: `${w}%` }}
                                />
                              </div>

                              <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition text-xs text-neutral-500">
                                {shortNum(pay)} / max
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-neutral-500">No project breakdown found for this range.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DAYS */}
            {tab === "days" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* side detail (pinned) */}
                <div className="lg:col-span-1 space-y-3">
                  <div className="rounded-2xl border p-4">
                    <div className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-indigo-600" />
                      Day Inspector
                    </div>
                    <div className="mt-2 text-sm text-neutral-600">
                      Click any row in the table to pin it here.
                    </div>

                    <div className="mt-3 rounded-xl border bg-white p-3">
                      {pinnedRow ? (
                        <>
                          <div className="text-xs text-neutral-500">Pinned date</div>
                          <div className="mt-1 text-lg font-semibold text-neutral-900">
                            {pinnedRow?.dateObj
                              ? format(pinnedRow.dateObj, "MMM d, yyyy", { locale: enUS })
                              : pinnedRow?.dateKey}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg border p-3">
                              <div className="text-[11px] text-neutral-500">RAW</div>
                              <div className="font-semibold">{toHours(pinnedRow.rawSeconds).toFixed(2)}h</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-[11px] text-neutral-500">ACTIVE</div>
                              <div className="font-semibold text-indigo-700">{toHours(pinnedRow.activeSeconds).toFixed(2)}h</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-[11px] text-neutral-500">IDLE</div>
                              <div className="font-semibold text-rose-600">{toHours(pinnedRow.idleSeconds).toFixed(2)}h</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-[11px] text-neutral-500">PAYABLE</div>
                              <div className="font-semibold text-emerald-700">{fmtMoney(pinnedRow.paymentPayable || 0)}</div>
                            </div>
                          </div>

                          <div className="mt-3 text-sm text-neutral-600">
                            Sessions:{" "}
                            <span className="font-semibold text-neutral-900">{pinnedRow.sessions || 0}</span>{" "}
                            <span className="text-xs text-neutral-500">
                              (payable: {pinnedRow.payableSessions || 0})
                            </span>
                          </div>

                          <button
                            onClick={() => setPinnedIdx(null)}
                            className="mt-3 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm font-semibold"
                          >
                            Unpin
                          </button>
                        </>
                      ) : (
                        <div className="text-sm text-neutral-500">
                          No pinned day. Click a row to inspect.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 bg-gradient-to-br from-white to-neutral-50">
                    <div className="text-sm font-semibold text-neutral-800">Reading guide</div>
                    <div className="mt-2 text-sm text-neutral-600">
                      RAW is computed from DB task_start/task_end. ACTIVE is duration. IDLE = RAW - ACTIVE.
                    </div>
                  </div>
                </div>

                {/* table */}
                <div className="lg:col-span-2">
                  <div className="rounded-2xl border overflow-hidden">
                    <div className="p-4 border-b bg-neutral-50">
                      <div className="text-sm font-semibold text-neutral-800">Day-wise Breakdown</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Click a row to pin it • Sort by clicking headers
                      </div>
                    </div>

                    <div className="max-h-[560px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b">
                          <tr className="text-left text-xs text-neutral-500">
                            <th className="p-3"><SortTh label="Date" k="date" /></th>
                            <th className="p-3"><SortTh label="RAW" k="raw" /></th>
                            <th className="p-3"><SortTh label="ACTIVE" k="active" /></th>
                            <th className="p-3"><SortTh label="IDLE" k="idle" /></th>
                            <th className="p-3"><SortTh label="Sessions" k="sessions" /></th>
                            <th className="p-3"><SortTh label="Payable" k="payable" /></th>
                          </tr>
                        </thead>

                        <tbody>
                          {sortedDays?.length ? (
                            sortedDays.map((d, i) => {
                              const isPinned = pinnedRow?.dateKey === d.dateKey;
                              const rawH = toHours(d.rawSeconds);
                              const activeH = toHours(d.activeSeconds);
                              const idleH = toHours(d.idleSeconds);

                              return (
                                <tr
                                  key={d.dateKey || i}
                                  className={`border-b last:border-b-0 cursor-pointer hover:bg-indigo-50/50 transition ${
                                    isPinned ? "bg-indigo-50" : ""
                                  }`}
                                  onClick={() => setPinnedIdx(i)}
                                  title="Click to pin"
                                >
                                  <td className="p-3 whitespace-nowrap">
                                    {d?.dateObj ? format(d.dateObj, "MMM d, yyyy", { locale: enUS }) : d.dateKey}
                                  </td>
                                  <td className="p-3">{rawH.toFixed(2)}h</td>
                                  <td className="p-3 font-semibold text-indigo-700">{activeH.toFixed(2)}h</td>
                                  <td className="p-3 font-semibold text-rose-600">{idleH.toFixed(2)}h</td>
                                  <td className="p-3">
                                    {d.sessions || 0}{" "}
                                    <span className="text-xs text-neutral-500">(payable: {d.payableSessions || 0})</span>
                                  </td>
                                  <td className="p-3 font-semibold text-emerald-700">{fmtMoney(d.paymentPayable || 0)}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td className="p-4 text-neutral-500" colSpan={6}>
                                No rows in this range.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* actions */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-neutral-500">
                Tip: Hover charts for tooltips. Use tabs for deeper review. Pin a day from the table for quick inspection.
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={loading ? undefined : onClose}
                  className="px-4 py-2 rounded-md border bg-white hover:bg-neutral-50 text-sm font-semibold"
                >
                  Close
                </button>

                <button
                  onClick={loading ? undefined : onReject}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                  disabled={loading}
                  title="Reject this timesheet"
                >
                  <XCircle className="h-4 w-4" />
                  {loading ? "Processing…" : "Reject"}
                </button>

                <button
                  onClick={loading ? undefined : onApprove}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  disabled={loading}
                  title="Approve this timesheet (and run payment if enabled)"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading ? "Processing…" : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
