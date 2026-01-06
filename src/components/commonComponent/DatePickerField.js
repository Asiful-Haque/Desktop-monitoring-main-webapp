// src/components/common/DatePickerField.js
"use client";

import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { Calendar } from "lucide-react";

const pad2 = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const ymdToDate = (ymd) => {
  if (!ymd) return null;
  const [y, m, d] = String(ymd).split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const formatUiDate = (ymd) => {
  const dt = ymdToDate(ymd);
  if (!dt) return "";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className = "",
  inputClassName = ""
}) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => ymdToDate(value) || undefined, [value]);
  const displayValue = useMemo(() => formatUiDate(value), [value]);

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? <Label className="text-sm font-medium">{label}</Label> : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setOpen(true);
            }}
          >
            <div className="relative">
              <Input
                readOnly
                value={displayValue}
                placeholder={placeholder}
                disabled={disabled}
                className={`h-10 pr-10 cursor-pointer ${inputClassName}`}
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="p-2 w-auto">
          <ShadCalendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              if (!d) return;
              onChange(toYmd(d));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
