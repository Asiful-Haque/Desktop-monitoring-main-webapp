"use client";

import React, { useMemo, useState } from "react";
import { Clock, X } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";

/* tiny cn */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

/** Build the payload (same logic, while skipping locked rows) */
function buildTimeEditPayload(details, tzLabel) {
  const changedItems = (details.items || []).filter(
    (it) =>
      it.flagger !== 1 &&
      it.flagger !== 2 &&
      (it.newStartISO !== it.startISO || it.newEndISO !== it.endISO)
  );

  const time_tracking_updates = changedItems.map((it) => {
    const oldSeconds = Number(it.seconds || 0);
    const newSeconds = Number(it.newSeconds || 0);
    const deltaSeconds = newSeconds - oldSeconds;
    return {
      serial_id: it.serial_id,
      project_id: it.project_id ?? null,
      task_id: it.task_id ?? null,
      old: {
        startISO: it.startISO || null,
        endISO: it.endISO || null,
        seconds: oldSeconds,
      },
      new: {
        startISO: it.newStartISO || null,
        endISO: it.newEndISO || null,
        seconds: newSeconds,
      },
      deltaSeconds,
    };
  });

  const taskMap = new Map();
  for (const row of time_tracking_updates) {
    const tId = row.task_id;
    if (!tId) continue;
    const prev =
      taskMap.get(tId) || { task_id: tId, deltaSeconds: 0, serial_ids: [] };
    prev.deltaSeconds += row.deltaSeconds;
    if (row.serial_id != null) prev.serial_ids.push(row.serial_id);
    taskMap.set(tId, prev);
  }
  const task_timing_adjustments = Array.from(taskMap.values()).map((x) => ({
    task_id: x.task_id,
    deltaSeconds: x.deltaSeconds,
    direction:
      x.deltaSeconds === 0 ? "none" : x.deltaSeconds > 0 ? "increase" : "decrease",
    serial_ids: x.serial_ids,
  }));

  const totalDeltaSeconds = time_tracking_updates.reduce(
    (s, r) => s + r.deltaSeconds,
    0
  );
  const increasedSeconds = time_tracking_updates
    .filter((r) => r.deltaSeconds > 0)
    .reduce((s, r) => s + r.deltaSeconds, 0);
  const decreasedSeconds = time_tracking_updates
    .filter((r) => r.deltaSeconds < 0)
    .reduce((s, r) => s + Math.abs(r.deltaSeconds), 0);

  return {
    context: {
      dateKey: details.dateKey,
      timezone: tzLabel,
      reason: (details.reason || "").trim(),
    },
    time_tracking_updates,
    task_timing_adjustments,
    rollup: {
      totalDeltaSeconds,
      increasedSeconds,
      decreasedSeconds,
      rowsChanged: time_tracking_updates.length,
      tasksAffected: task_timing_adjustments.length,
    },
  };
}

export default function TimeSheetEditModal({
  details,
  onClose,
  onUpdateItemTime,
  onReasonChange,
  onSaved, // (result) => void
  tzLabel = "Asia/Dhaka",
  tenantId,
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => details?.items || [], [details?.items]);
  const reason = useMemo(() => details?.reason || "", [details?.reason]);

  const liveTotalSeconds = useMemo(
    () => items.reduce((sum, it) => sum + (it.newSeconds || 0), 0),
    [items]
  );

  const hasInvalid = useMemo(
    () =>
      items.some((it) => {
        if (it.flagger === 1 || it.flagger === 2) return false;
        return (
          !it.newStartISO ||
          !it.newEndISO ||
          new Date(it.newEndISO).getTime() <=
            new Date(it.newStartISO).getTime()
        );
      }),
    [items]
  );

  const hasAnyChange = useMemo(
    () =>
      items.some(
        (it) =>
          it.flagger !== 1 &&
          it.flagger !== 2 &&
          (it.newStartISO !== it.startISO || it.newEndISO !== it.endISO)
      ),
    [items]
  );

  const canSubmit = !hasInvalid && hasAnyChange && reason.trim().length > 0;

  if (!details) return null;

  async function handleSubmit() {
    const payload = buildTimeEditPayload(details, tzLabel);
    if (!payload.time_tracking_updates.length) {
      alert("No changes detected.");
      return;
    }

    try {
      setSaving(true);

      // 1) Recompute duration + session_payment for the exact serial_ids
      //    using the NEW start/end times.
      const recomputeItems = payload.time_tracking_updates.map((row) => ({
        serial_id: row.serial_id,
        task_start: row.new.startISO, // ISO is fine; API normalizes
        task_end: row.new.endISO,
        // Optional overrides if you need them:
        // project_id: row.project_id,
        // developer_id: details?.developer_id
      }));

      const recomputeRes = await fetch("/api/time-tracking/compute-session-for-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: recomputeItems }),
      });

      const recomputeJson = await recomputeRes.json();
      if (!recomputeRes.ok) {
        throw new Error(recomputeJson?.error || "Failed to recompute session payment");
      }

      console.groupCollapsed("✅ Recompute result (duration + session_payment)");
      console.log(recomputeJson);
      console.groupEnd();

      // 2) Apply edits (updates time_tracking start/end/duration + tasks.last_timing)
      const apiBody = {
        context: payload.context,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        changes: payload.time_tracking_updates.map((row) => ({
          serial_id: row.serial_id,
          task_id: row.task_id,
          project_id: row.project_id ?? null,
          new: row.new,
        })),
      };

      const applyRes = await fetch("/api/time-tracking/apply-edits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody),
      });
      const applyJson = await applyRes.json();
      if (!applyRes.ok) {
        throw new Error(applyJson?.error || "Failed to apply edits");
      }

      console.groupCollapsed("✅ Apply edits result");
      console.log(applyJson);
      console.groupEnd();

      if (typeof onSaved === "function") onSaved(applyJson);
      router.refresh();
      alert("Edits saved.");
      onClose();
    } catch (e) {
      console.error("Submit failed:", e);
      alert(e?.message || "Failed to save edits");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl rounded-xl border bg-white dark:bg-neutral-900 shadow-xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Sessions for
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {format(details.dateObj, "EEE, MMM d, yyyy", { locale: enUS })}
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Close"
              disabled={saving}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {/* Original total */}
          <div className="rounded-lg border bg-neutral-50 dark:bg-neutral-800/50 p-3 text-sm flex items-center justify-between">
            <div className="text-neutral-600 dark:text-neutral-300">
              Original total
            </div>
            <div className="inline-flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <Clock className="h-4 w-4" /> {details.totalLabel || "—"}
            </div>
          </div>

          {/* Rows */}
          <div className="mt-4 rounded-lg border divide-y divide-neutral-200 dark:divide-neutral-800">
            {!details.items || details.items.length === 0 ? (
              <div className="p-3 text-sm text-neutral-500 dark:text-neutral-400">
                No sessions found for this day.
              </div>
            ) : (
              details.items.map((it, i) => {
                const locked = it.flagger === 1 || it.flagger === 2;
                const invalid =
                  !locked &&
                  (!it.newStartISO ||
                    !it.newEndISO ||
                    new Date(it.newEndISO).getTime() <=
                      new Date(it.newStartISO).getTime());

                return (
                  <div
                    key={it.serial_id ?? `row-${i}`}
                    className={cn(
                      "p-3 flex flex-col gap-2",
                      locked && "bg-rose-50/60 dark:bg-rose-950/20"
                    )}
                  >
                    {/* badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800">
                        <span className="font-medium">Project:</span>{" "}
                        {it.project_name ?? it.project_id ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800">
                        <span className="font-medium">Task:</span>{" "}
                        {it.task_name ?? it.task_id ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 px-1.5 py-0.5 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                        <span className="font-medium">serial_id:</span>{" "}
                        {it.serial_id ?? "—"}
                      </span>
                    </div>

                    {/* locked warning */}
                    {locked && (
                      <div className="text-xs font-medium text-rose-700 dark:text-rose-300">
                        This session is locked. It’s already submitted for payment
                        and cannot be edited.
                      </div>
                    )}

                    {/* editors */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs mb-1 text-neutral-600 dark:text-neutral-300">
                          Start time (HH:mm:ss)
                        </label>
                        <input
                          type="time"
                          step="1"
                          value={it.newStartHMS || ""}
                          onChange={(e) =>
                            onUpdateItemTime(i, "start", e.target.value)
                          }
                          className={cn(
                            "w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900 dark:border-neutral-700",
                            invalid ? "border-rose-400" : "",
                            locked && "opacity-60 cursor-not-allowed"
                          )}
                          disabled={saving || locked}
                        />
                      </div>

                      <div>
                        <label className="block text-xs mb-1 text-neutral-600 dark:text-neutral-300">
                          End time (HH:mm:ss)
                        </label>
                        <input
                          type="time"
                          step="1"
                          value={it.newEndHMS || ""}
                          onChange={(e) =>
                            onUpdateItemTime(i, "end", e.target.value)
                          }
                          className={cn(
                            "w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900 dark:border-neutral-700",
                            invalid ? "border-rose-400" : "",
                            locked && "opacity-60 cursor-not-allowed"
                          )}
                          disabled={saving || locked}
                        />
                      </div>

                      <div className="sm:text-right">
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          New duration
                        </div>
                        <div
                          className={cn(
                            "font-semibold",
                            invalid
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-neutral-900 dark:text-neutral-100"
                          )}
                        >
                          {fmtHMS(it.newSeconds)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* New total */}
          <div className="mt-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800/50 p-3 text-sm flex items-center justify-between">
            <div className="text-neutral-600 dark:text-neutral-300">
              New total (after edits)
            </div>
            <div className="inline-flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <Clock className="h-4 w-4" /> {fmtHMS(liveTotalSeconds)}
            </div>
          </div>

          {/* Reason */}
          <div className="mt-4">
            <label className="block text-sm mb-1 text-neutral-700 dark:text-neutral-200">
              Reason for change
            </label>
            <textarea
              rows={3}
              value={details.reason}
              onChange={onReasonChange}
              className="w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900 dark:border-neutral-700"
              placeholder={`Explain why you are adjusting the times… (Times interpreted in ${tzLabel})`}
              disabled={saving}
            />
          </div>
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className={cn(
                "px-3 py-2 text-sm rounded-md text-white",
                !canSubmit || saving
                  ? "bg-neutral-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              )}
              title={
                !details.reason.trim()
                  ? "Please provide a reason."
                  : hasInvalid
                  ? "Ensure each end time is after start time."
                  : !hasAnyChange
                  ? "Make at least one change."
                  : "Submit changes"
              }
            >
              {saving ? "Saving…" : "Submit Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
