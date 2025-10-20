"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Clock, TrendingUp, Pencil } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import TimeSheetEditModal from "../TimeSheetEditModal";

/* utils */
function cn(...classes) { return classes.filter(Boolean).join(" "); }

function normalizeAndSort(src) {
  const normalized = (src ?? []).map((d) => ({
    date: d.date instanceof Date ? d.date : new Date(d.date),
    hours: typeof d.hours === "number" ? d.hours : undefined,
    label: d.label,
  }));
  normalized.sort((a, b) => a.date - b.date);
  return normalized;
}
function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function buildWindowSeries(allData, windowDays) {
  const map = new Map();
  for (const r of allData) map.set(keyOf(r.date), { hours: r.hours, label: r.label });
  const anchor = new Date(allData[allData.length - 1].date);
  const series = [];
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - (windowDays - 1));
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = keyOf(d);
    const v = map.get(k) || {};
    series.push({ date: d, hours: v.hours, label: v.label });
  }
  return series;
}
function buildSparkPath(points, width = 240, height = 48, maxY = 8) {
  if (!points.length) return "";
  const stepX = width / Math.max(points.length - 1, 1);
  const safeMax = Math.max(1, maxY);
  const yOf = (v) => height - (Math.min(v ?? 0, safeMax) / safeMax) * height;
  return points.map((p, i) => {
    const x = i * stepX;
    const y = yOf(typeof p === "number" ? p : 0);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
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

/* Time helpers (must match server aggregation TZ) */
const TZ = "Asia/Dhaka";
function isoToLocalHMS(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const obj = Object.fromEntries(f.map((p) => [p.type, p.value]));
  return `${obj.hour ?? "00"}:${obj.minute ?? "00"}:${obj.second ?? "00"}`;
}
function combineDateWithHMS(isoBase, hms) {
  if (!isoBase || !hms) return null;
  const base = new Date(isoBase);
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(base);
  const objD = Object.fromEntries(dateParts.map((p) => [p.type, p.value]));
  const ymd = `${objD.year}-${objD.month}-${objD.day}`;
  const [HH, MM, SS] = hms.split(":").map((x) => parseInt(x || "0", 10));
  const local = new Date(`${ymd}T${String(HH).padStart(2,"0")}:${String(MM).padStart(2,"0")}:${String(SS).padStart(2,"0")}`);
  return local.toISOString();
}
function diffSecondsISO(startISO, endISO) {
  if (!startISO || !endISO) return 0;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  return Math.max(0, Math.floor((b - a) / 1000));
}

export default function TimeSheet({ initialWindow, data, detailsByDate }) {
  const router = useRouter();

  const [windowDays, setWindowDays] = useState(
    [7, 15, 31].includes(initialWindow) ? initialWindow : 7
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [clientData, setClientData] = useState([]);
  useEffect(() => {
    if (data && data.length) setClientData(normalizeAndSort(data));
  }, [data]);

  const hasData = clientData.length > 0;
  const windowSeries = useMemo(
    () => (!hasData ? [] : buildWindowSeries(clientData, windowDays)),
    [clientData, hasData, windowDays]
  );
  const daysWithHours = useMemo(
    () => windowSeries.filter((d) => typeof d.hours === "number"),
    [windowSeries]
  );
  const totalHours = daysWithHours.reduce((sum, d) => sum + (d.hours ?? 0), 0);
  const avg = daysWithHours.length ? (totalHours / daysWithHours.length).toFixed(1) : "0";
  const sparkPoints = windowSeries.map((d) => (typeof d.hours === "number" ? d.hours : 0));
  const sparkPath = buildSparkPath(sparkPoints);
  const rangeButtons = [
    { label: "Weekly", value: 7 },
    { label: "15 Days", value: 15 },
    { label: "Monthly", value: 31 },
  ];
  const isPlaceholder = !mounted && (!data || data.length === 0);

  /* Day Details state (modal is separate component) */
  const [details, setDetails] = useState(null);

  function openDetails(day) {
    const dateKey = keyOf(day.date);
    const srcItems = detailsByDate?.[dateKey] || [];
    const totalLabel = clientData.find((x) => keyOf(x.date) === dateKey)?.label || "";

    const items = srcItems.map((it) => {
      const startHMS = isoToLocalHMS(it.startISO);
      const endHMS = isoToLocalHMS(it.endISO);
      return {
        ...it, // serial_id, project_name, task_name, ids
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
    setDetails((s) => ({ ...s, reason: e.target.value }));
  }

  function onSubmitChanges() {
    if (!details) return;
    const changes = details.items
      .filter((it) => it.newStartISO !== it.startISO || it.newEndISO !== it.endISO)
      .map((it) => ({
        serial_id: it.serial_id,
        project_id: it.project_id,
        task_id: it.task_id,
        old: { startISO: it.startISO, endISO: it.endISO, seconds: it.seconds },
        new: { startISO: it.newStartISO, endISO: it.newEndISO, seconds: it.newSeconds },
      }));

    const payload = {
      dateKey: details.dateKey,
      reason: details.reason.trim(),
      timezone: TZ,
      changes,
    };
    console.log("Submit TimeSheet Changes payload:", payload);
    alert("Payload logged in console. Wire this to your update API.");
    closeDetails();
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
          <div className="shrink-0">
            <div className="inline-flex rounded-lg border bg-white dark:bg-neutral-900 p-1">
              {rangeButtons.map((btn) => {
                const active = windowDays === btn.value;
                return (
                  <button
                    key={btn.value}
                    onClick={() => setWindowDays(btn.value)}
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
          </div>
        </div>

        {/* Sparkline */}
        <div className="px-5 pb-5 sm:px-6">
          <div className="rounded-lg border bg-white dark:bg-neutral-900 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <TrendingUp className="h-4 w-4" /> Activity trend
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Scale: 0–8h</div>
            </div>
            <svg
              viewBox="0 0 240 48"
              className="w-full h-12 mt-2 text-indigo-500 dark:text-indigo-400"
              suppressHydrationWarning
            >
              {hasData && <path d={buildSparkPath(sparkPoints)} fill="none" stroke="currentColor" strokeWidth="2" />}
            </svg>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-neutral-900 p-4">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-indigo-600/90 dark:bg-indigo-400/90" />
          <div className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Total Hours (filled days)
          </div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {totalHours.toFixed(2)}h
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            Sum of non-empty days
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-neutral-900 p-4">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-indigo-600/80 dark:bg-indigo-400/80" />
          <div className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Days Shown
          </div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {windowSeries.length}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">Window length</div>
        </div>
        <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-neutral-900 p-4">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-indigo-600/70 dark:bg-indigo-400/70" />
          <div className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Avg Hours/Day (filled)
          </div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {avg}h
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            Mean of filled days
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xxs text-neutral-600 dark:text-neutral-300">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-rose-100 border border-rose-300 dark:bg-rose-950/30 dark:border-rose-800" />
          0–3h
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-amber-100 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-800" />
          4–5h
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800" />
          6–8+h
        </div>
      </div>

      {/* Entries */}
      <div>
        <div className="text-sm font-medium mb-2 flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
          <TrendingUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" /> Last {windowDays} Days
        </div>

        {!hasData ? (
          <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" /> No days to display.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {windowSeries.map((item, idx) => {
              const hasHours = typeof item.hours === "number";
              const dateKey = keyOf(item.date);
              const hasSessions = (detailsByDate?.[dateKey] || []).length > 0;

              return (
                <div
                  key={`${format(item.date, "yyyy-MM-dd", { locale: enUS })}-${idx}`}
                  className={cn(
                    "relative rounded-lg p-3 text-center transition-colors min-h-24 group",
                    getBoxChrome(item.hours)
                  )}
                >
                  {/* Only show edit icon when there are sessions for that day */}
                  {hasSessions && (
                    <button
                      type="button"
                      onClick={() => openDetails(item)}
                      className="absolute right-1.5 top-1.5 inline-flex items-center justify-center h-7 w-7 rounded-md border border-neutral-200 bg-white/80 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:bg-neutral-700"
                      aria-label={`View details for ${dateKey}`}
                      title="View / edit day"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}

                  <div className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {format(item.date, "EEE", { locale: enUS })}
                  </div>
                  <div className="text-xl font-semibold leading-none text-neutral-900 dark:text-neutral-100">
                    {format(item.date, "d", { locale: enUS })}
                  </div>
                  <div className="text-[11px] mb-2 text-neutral-500 dark:text-neutral-400">
                    {format(item.date, "MMM yyyy", { locale: enUS })}
                  </div>

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
                      <Clock className="h-4.5 w-4.5" />
                      <span>{item.hours}h</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => router.push("/request-payment")}
          className={cn(
            "px-3 py-2 rounded-md text-sm font-medium transition",
            "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          )}
        >
          Request Payment
        </button>
      </div>

      {/* Modal (separate component) */}
      {details && (
        <TimeSheetEditModal
          details={details}
          tzLabel={TZ}
          onClose={closeDetails}
          onUpdateItemTime={updateItemTime}
          onReasonChange={(e) => onReasonChange(e)}
          onSubmitChanges={onSubmitChanges}
        />
      )}
    </div>
  );
}
