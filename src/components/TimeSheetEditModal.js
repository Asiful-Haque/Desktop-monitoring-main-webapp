"use client";

import React, { useMemo } from "react";
import { Clock, X } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

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

export default function TimeSheetEditModal({
  details,                 
  onClose,
  onUpdateItemTime,       
  onReasonChange,          
  onSubmitChanges,         
  tzLabel = "Asia/Dhaka",
}) {
  const items = useMemo(() => details?.items || [], [details?.items]);
  const reason = useMemo(() => details?.reason || "", [details?.reason]);

  const liveTotalSeconds = useMemo(
    () => items.reduce((sum, it) => sum + (it.newSeconds || 0), 0),
    [items]
  );

  const hasInvalid = useMemo(
    () =>
      items.some(
        (it) =>
          !it.newStartISO ||
          !it.newEndISO ||
          new Date(it.newEndISO).getTime() <= new Date(it.newStartISO).getTime()
      ),
    [items]
  );

  const hasAnyChange = useMemo(
    () =>
      items.some(
        (it) => it.newStartISO !== it.startISO || it.newEndISO !== it.endISO
      ),
    [items]
  );

  const canSubmit = !hasInvalid && hasAnyChange && reason.trim().length > 0;

  if (!details) return null;

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
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Sessions for</div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {format(details.dateObj, "EEE, MMM d, yyyy", { locale: enUS })}
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">

          <div className="rounded-lg border bg-neutral-50 dark:bg-neutral-800/50 p-3 text-sm flex items-center justify-between">
            <div className="text-neutral-600 dark:text-neutral-300">Original total</div>
            <div className="inline-flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <Clock className="h-4 w-4" /> {details.totalLabel || "—"}
            </div>
          </div>


          <div className="mt-4 rounded-lg border divide-y divide-neutral-200 dark:divide-neutral-800">
            {!details.items || details.items.length === 0 ? (
              <div className="p-3 text-sm text-neutral-500 dark:text-neutral-400">
                No sessions found for this day.
              </div>
            ) : (
              details.items.map((it, i) => {
                const invalid =
                  !it.newStartISO ||
                  !it.newEndISO ||
                  new Date(it.newEndISO).getTime() <= new Date(it.newStartISO).getTime();

                return (
                  <div key={it.serial_id ?? `row-${i}`} className="p-3 flex flex-col gap-2">

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


                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs mb-1 text-neutral-600 dark:text-neutral-300">
                          Start time (HH:mm:ss)
                        </label>
                        <input
                          type="time"
                          step="1"
                          value={it.newStartHMS || ""}
                          onChange={(e) => onUpdateItemTime(i, "start", e.target.value)}
                          className={cn(
                            "w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900 dark:border-neutral-700",
                            invalid ? "border-rose-400" : ""
                          )}
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
                          onChange={(e) => onUpdateItemTime(i, "end", e.target.value)}
                          className={cn(
                            "w-full rounded-md border px-3 py-2 bg-white dark:bg-neutral-900 dark:border-neutral-700",
                            invalid ? "border-rose-400" : ""
                          )}
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

          <div className="mt-3 rounded-lg border bg-neutral-50 dark:bg-neutral-800/50 p-3 text-sm flex items-center justify-between">
            <div className="text-neutral-600 dark:text-neutral-300">New total (after edits)</div>
            <div className="inline-flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <Clock className="h-4 w-4" /> {fmtHMS(liveTotalSeconds)}
            </div>
          </div>


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
            />
          </div>
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={onSubmitChanges}
              disabled={!canSubmit}
              className={cn(
                "px-3 py-2 text-sm rounded-md text-white",
                !canSubmit ? "bg-neutral-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
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
              Submit Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
