"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import moment from "moment";

/** -------------------- Utils -------------------- **/
const getRandomColor = () => {
  // Soft saturated HSL -> HEX for pleasant colors
  const h = Math.floor(Math.random() * 360);
  const s = 70 + Math.floor(Math.random() * 20);
  const l = 55 + Math.floor(Math.random() * 10);
  return hslToHex(h, s, l);
};

const hslToHex = (h, s, l) => {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

const darken = (hex, p = 18) => {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const d = (v) => Math.max(0, Math.min(255, Math.round(v * (1 - p / 100))));
  return `#${d(r).toString(16).padStart(2, "0")}${d(g).toString(16).padStart(2, "0")}${d(b).toString(16).padStart(2, "0")}`;
};

const getProjectId = (p) => p?.id ?? p?.project_id;
const getProjectName = (p) => p?.name ?? p?.project_name;
const minutesBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));

/** Stable pastel color from project name */
function projectColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return hslToHex(h, 65, 60);
}

/** -------------------- Component -------------------- **/
const IndGanttChart = ({ currUser, projects, tasks }) => {
  const [developerColors, setDeveloperColors] = useState({});
  const [isMounted, setIsMounted] = useState(false);
  const [nowPct, setNowPct] = useState(null);

  // Only current user's tasks
  const userTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter((t) => String(t.developer_id) === String(currUser?.id));
  }, [tasks, currUser]);

  // Colors (future-friendly if you add more devs)
  useEffect(() => {
    const colors = {};
    (tasks || []).forEach((t) => {
      if (!colors[t.developer_id]) colors[t.developer_id] = getRandomColor();
    });
    setDeveloperColors(colors);
    setIsMounted(true);
  }, [tasks]);

  // 24h ticks
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Map: project -> tasks for this user
  const projectTaskMap = useMemo(() => {
    const map = {};
    (projects || []).forEach((p) => {
      const pid = getProjectId(p);
      if (pid != null) map[pid] = [];
    });
    userTasks.forEach((t) => {
      if (t?.project_id != null && Object.prototype.hasOwnProperty.call(map, t.project_id)) {
        map[t.project_id].push(t);
      }
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => new Date(a.task_start) - new Date(b.task_start))
    );
    return map;
  }, [projects, userTasks]);

  // Totals per project (minutes)
  const projectTotals = useMemo(() => {
    const totals = {};
    Object.entries(projectTaskMap).forEach(([pid, list]) => {
      totals[pid] = list.reduce((sum, t) => sum + minutesBetween(t.task_start, t.task_end), 0);
    });
    return totals;
  }, [projectTaskMap]);

  // “Now” marker
  useEffect(() => {
    const updateNow = () => {
      const d = new Date();
      const pct = ((d.getHours() + d.getMinutes() / 60) / 24) * 100;
      setNowPct(pct);
    };
    updateNow();
    const id = setInterval(updateNow, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Bar geometry
  const getTaskBarStyle = (task, index, allTasks) => {
    const start = new Date(task.task_start);
    const end = new Date(task.task_end);
    const startPct = ((start.getHours() + start.getMinutes() / 60) / 24) * 100;
    const endPct = ((end.getHours() + end.getMinutes() / 60) / 24) * 100;
    const width = Math.max(endPct - startPct, 1.25);
    const sameStart = allTasks.filter((t) => t.task_start === task.task_start).length || 1;
    const offset = (index / sameStart) * 3.5;
    return { left: `${startPct + offset}%`, width: `${width}%` };
  };

  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

  if (!isMounted) return null;

  return (
    <Card className="relative border-0 shadow-2xl bg-white/80 backdrop-blur-md overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-gradient-to-br from-blue-300/25 to-blue-300/25 blur-2xl" />
        <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-br from-blue-300/25 to-blue-300/25 blur-2xl" />
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-slate-800 tracking-tight">
              {currUser?.name ? `${currUser.name}'s Timeline` : "My Timeline"}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              24-hour view • grouped by project
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                Local time: {moment().format("HH:mm")}
              </span>
            </CardDescription>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 shadow-sm">
            <div
              className="h-3 w-3 rounded-full ring-2 ring-white"
              style={{ background: developerColors[currUser?.id] || "#758397FF" }}
            />
            <div className="text-xs text-slate-600">
              <div className="font-medium text-slate-700 leading-none">{currUser?.name || "You"}</div>
              <div className="opacity-70">Sessions</div>
            </div>
          </div>
        </div>

        {/* 🔧 Sticky time axis aligned via same 2-col grid (14rem | 1fr) */}
        <div className="sticky top-0 z-10 mt-4 rounded-md bg-white/85 backdrop-blur-sm border border-slate-200">
          <div className="grid" style={{ gridTemplateColumns: "14rem 1fr" }}>
            {/* Left spacer equal to project column */}
            <div className="h-full w-[14rem] border-r border-slate-200 rounded-l-md" />
            {/* Hour labels aligned with lanes */}
            <div className="relative">
              {/* Optional faint grid under axis */}
              <div className="absolute inset-0 pointer-events-none">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 w-px bg-slate-200/60"
                    style={{ left: `${(hour / 24) * 100}%` }}
                  />
                ))}
              </div>

              <div className="relative flex justify-between text-[10px] text-slate-500 py-2 px-2">
                {hours.filter((_, i) => i % 2 === 0).map((hour) => (
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
        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
          <div className="divide-y divide-slate-200">
            {(projects || []).map((project, rowIdx) => {
              const pid = getProjectId(project);
              const pname = getProjectName(project);
              const tasksForProject = projectTaskMap[pid] || [];
              const totalMin = projectTotals[pid] || 0;

              const chip = projectColor(pname);
              const chipShadow = `${chip}55`;

              return (
                <div
                  key={pid}
                  className={`group relative flex items-stretch transition-colors ${
                    rowIdx % 2 === 0 ? "bg-slate-50/60" : "bg-white"
                  } hover:bg-slate-50`}
                >
                  {/* Left project column (fixed 14rem = w-56) */}
                  <div className="w-56 shrink-0 px-4 py-3 border-r border-slate-200">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full shadow-sm ring-1 ring-black/5"
                        style={{ background: chip, boxShadow: `0 2px 10px ${chipShadow}` }}
                        title={pname?.[0] || "P"}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate" title={pname}>
                          {pname}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="inline-flex items-center rounded-full bg-slate-100/80 px-2 py-0.5 text-slate-600">
                            Total: <span className="ml-1 font-semibold text-slate-700">{fmtMin(totalMin)}</span>
                          </span>
                          {tasksForProject.length === 0 && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5">
                              No sessions
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right timeline lane */}
                  <div className="relative flex-1 h-16">
                    {/* Hour grid */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute top-0 bottom-0 w-px bg-slate-200/60"
                        style={{ left: `${(hour / 24) * 100}%` }}
                      />
                    ))}

                    {/* “Now” marker */}
                    {nowPct !== null && nowPct >= 0 && nowPct <= 100 && (
                      <div
                        className="absolute top-0 bottom-0 w-[2px] bg-fuchsia-500/90"
                        style={{ left: `${nowPct}%` }}
                        title={`Now: ${moment().format("HH:mm")}`}
                      >
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.8)]" />
                        <div className="absolute inset-0 animate-pulse shadow-[0_0_20px_2px_rgba(217,70,239,0.35)]" />
                      </div>
                    )}

                    {/* Task bars */}
                    {tasksForProject.map((task, idx) => {
                      const base = developerColors[task.developer_id] || "#64748b";
                      const grad = `linear-gradient(90deg, ${base} 0%, ${darken(base, 22)} 100%)`;
                      const startLabel = moment(task.task_start).format("HH:mm");
                      const endLabel = moment(task.task_end).format("HH:mm");
                      const mins = minutesBetween(task.task_start, task.task_end);
                      const dur = fmtMin(mins);

                      return (
                        <div
                          key={`${task.task_id}-${idx}`}
                          className="absolute top-2.5 bottom-2.5 rounded-xl ring-1 ring-black/10 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer"
                          style={{
                            ...getTaskBarStyle(task, idx, tasksForProject),
                            background: grad,
                            boxShadow: `0 6px 18px ${base}35`,
                          }}
                          title={`Task ${task.task_id} • ${moment(task.work_date).format("YYYY-MM-DD")} • ${startLabel}-${endLabel} • ${dur}`}
                        >
                          {/* glossy overlay */}
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/15 to-transparent" />
                          {/* labels */}
                          <div className="absolute inset-0 flex items-center justify-between px-2">
                            <span className="truncate text-[11px] font-semibold text-white/95 drop-shadow">
                              T{task.task_id}
                            </span>
                            <span className="ml-2 text-[10px] font-medium text-white/90 drop-shadow">
                              {startLabel}-{endLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Hover glow */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-y-0 left-56 right-0 bg-gradient-to-r from-transparent via-fuchsia-100/10 to-transparent" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty state */}
        {(!projects || projects.length === 0) && (
          <div className="mt-6 text-center text-sm text-slate-500">No projects to display.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default IndGanttChart;
