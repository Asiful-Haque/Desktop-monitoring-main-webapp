"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import moment from "moment";

/********************** Utils **********************/
function todayLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

// Stable color per developer id
function colorFromId(id) {
  const str = String(id ?? "?");
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return hslToHex(h, 68, 58);
}

const minutesBetween = (a, b) =>
  Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));

/********************** Component **********************/
const GanttChart = ({ projectId, tasks, projectName }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [nowPct, setNowPct] = useState(null);
  const [fetched, setFetched] = useState({
    loading: false,
    error: "",
    items: [],
    hasLoaded: false,
  });

  // Fetch by project + date whenever either changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!projectId) return;
      setFetched((s) => ({ ...s, loading: true, error: "" }));
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/time-tracking/${projectId}?date=${selectedDate}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        if (!cancelled)
          setFetched({ loading: false, error: "", items, hasLoaded: true });
      } catch (e) {
        console.error("Failed to fetch project tasks:", e);
        if (!cancelled)
          setFetched({
            loading: false,
            error: "Failed to load data",
            items: [],
            hasLoaded: true,
          });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, selectedDate]);

  // Use server data after first load; until then show passed-in tasks for initial paint
  const effectiveTasks = useMemo(
    () => (fetched.hasLoaded ? fetched.items : tasks || []),
    [fetched.hasLoaded, fetched.items, tasks]
  );

  // Group by developer
  const groupedByDeveloper = useMemo(() => {
    const acc = {};
    (effectiveTasks || []).forEach((t) => {
      const devId = t.developer_id ?? "unknown";
      if (!acc[devId])
        acc[devId] = {
          developer: { id: devId, name: `Dev ${devId}`, color: colorFromId(devId) },
          tasks: [],
        };
      acc[devId].tasks.push(t);
    });
    Object.values(acc).forEach((g) =>
      g.tasks.sort(
        (a, b) => new Date(a.task_start) - new Date(b.task_start)
      )
    );
    return acc;
  }, [effectiveTasks]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  // High-precision "now" marker anchored to selectedDate; refresh ~10s
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const dayStart = new Date(`${selectedDate}T00:00:00`);
      const pct = ((now - dayStart) / 86400000) * 100;
      setNowPct(Math.max(0, Math.min(100, pct)));
    };
    update();
    const id = setInterval(update, 10 * 1000);
    return () => clearInterval(id);
  }, [selectedDate]);

  // Bar geometry (includes seconds + ms)
  const getTaskBarStyle = (task, index, allTasks) => {
    const start = new Date(task.task_start);
    const end = new Date(task.task_end);
    const toPct = (d) => {
      const secs =
        d.getHours() * 3600 +
        d.getMinutes() * 60 +
        d.getSeconds() +
        d.getMilliseconds() / 1000;
      return (secs / 86400) * 100;
    };
    const startPct = toPct(start);
    const endPct = toPct(end);
    const width = Math.max(endPct - startPct, 1.5);
    const sameStart =
      allTasks.filter((t) => t.task_start === task.task_start).length || 1;
    const offset = (index / sameStart) * 3.5;
    return { left: `${startPct + offset}%`, width: `${width}%` };
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);
  if (!isMounted) return null;

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-slate-800">
              {projectName
                ? `${projectName} — Developer Timeline`
                : "Developer Performance Timeline"}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              24-hour task timeline • grouped by developer
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                Local time: {moment().format("HH:mm")} ({selectedDate})
              </span>
            </CardDescription>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Select date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sticky axis aligned to lanes */}
        <div className="sticky top-0 z-10 mt-4 rounded-md bg-white/85 backdrop-blur-sm border border-slate-200">
          <div className="grid" style={{ gridTemplateColumns: "12rem 1fr" }}>
            <div className="h-full w-[12rem] border-r border-slate-200 rounded-l-md" />
            <div className="relative">
              <div className="absolute inset-0 pointer-events-none">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 w-px bg-slate-200/60"
                    style={{ left: `${(hour / 24) * 100}%` }}
                  />
                ))}
                {nowPct !== null && nowPct >= 0 && nowPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 left-0 w-[2px] bg-fuchsia-500/90"
                    style={{ left: `${nowPct}%` }}
                  />
                )}
              </div>
              <div className="relative flex justify-between text-[10px] text-slate-500 py-2 px-2">
                {hours.map((hour) => (
                  <span key={hour} className="w-8 text-center">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                ))}
              </div>
              <div className="h-px bg-slate-200" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Loading / empty / error states */}
        {fetched.loading && (
          <div className="mb-3 text-sm text-slate-500">
            Loading sessions for {selectedDate}…
          </div>
        )}
        {!fetched.loading && fetched.error && (
          <div className="mb-3 text-sm text-red-600">{fetched.error}</div>
        )}
        {fetched.hasLoaded && !fetched.loading && fetched.items.length === 0 && (
          <div className="mb-3 text-sm text-slate-500">
            No sessions on {selectedDate} for this project.
          </div>
        )}

        <div className="space-y-4">
          {Object.values(groupedByDeveloper).map((group, rowIdx) => (
            <div
              key={group.developer.id}
              className={`flex items-center gap-4 rounded-xl border border-slate-200 p-3 ${
                rowIdx % 2 === 0 ? "bg-slate-50/50" : "bg-white"
              }`}
            >
              {/* Developer pill */}
              <div className="flex items-center gap-3 w-48 shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow"
                  style={{ backgroundColor: group.developer.color }}
                >
                  {String(group.developer.name || "Dev")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {group.developer.name}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Total:{" "}
                    {(() => {
                      const m = group.tasks.reduce(
                        (s, t) => s + minutesBetween(t.task_start, t.task_end),
                        0
                      );
                      return m >= 60
                        ? `${Math.floor(m / 60)}h ${m % 60}m`
                        : `${m}m`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Timeline lane */}
              <div className="relative flex-1 h-12 rounded-lg bg-slate-100 overflow-hidden">
                {/* Hour grid */}
                {hours.map((hour) => (
                  <div
                    key={`grid-${hour}`}
                    className="absolute top-0 bottom-0 w-px bg-slate-200/60"
                    style={{ left: `${(hour / 24) * 100}%` }}
                  />
                ))}

                {/* Now marker */}
                {nowPct !== null && nowPct >= 0 && nowPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 left-0 w-[2px] bg-fuchsia-500/80"
                    style={{ left: `${nowPct}%` }}
                  />
                )}

                {/* Task bars */}
                {group.tasks.map((task, idx) => (
                  <div
                    key={`${task.task_id}-${idx}`}
                    className="absolute top-1.5 bottom-1.5 rounded-md shadow-sm ring-1 ring-black/10 hover:shadow-md transition-all duration-200 cursor-pointer"
                    style={{
                      ...getTaskBarStyle(task, idx, group.tasks),
                      background: group.developer.color,
                      minWidth: "32px",
                    }}
                    title={`Task ${task.task_id} • ${moment(task.work_date).format(
                      "YYYY-MM-DD"
                    )} • ${moment(task.task_start).format("HH:mm")} - ${moment(
                      task.task_end
                    ).format("HH:mm")}`}
                  >
                    <div className="absolute inset-0 rounded-md bg-gradient-to-b from-white/15 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-between px-1.5">
                      <span className="truncate text-[11px] font-semibold text-white drop-shadow">
                        T{task.task_id}
                      </span>
                      <span className="ml-2 text-[10px] font-bold text-black/90 drop-shadow">
                        {moment(task.task_start).format("HH:mm")}–
                        {moment(task.task_end).format("HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GanttChart;
