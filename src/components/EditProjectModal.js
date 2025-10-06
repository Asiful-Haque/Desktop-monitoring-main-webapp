"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "in_progress", label: "In progress" },
  { value: "pending", label: "Pending" },
  { value: "archieved", label: "Archived" }, // keep your existing spelling if API expects it
  { value: "completed", label: "Completed" },
];

function toLocalYMD(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function EditProjectModal({ open, onOpenChange, projectId }) {
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    project_name: "",
    project_description: "",
    status: "",
    start_date: "",
    deadline: "",
    budget: "",
    assigned_to_name: "", // display only
  });

  // Fetch details when opening
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!open || !projectId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects/details/${projectId}`,
          { credentials: "include", cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to load project");
        const data = await res.json();
        const p = data?.projectDetailsResponse || {};

        if (!cancelled) {
          setForm({
            project_name: p.project_name || "",
            project_description: p.project_description || "",
            status: p.status || "",
            start_date: toLocalYMD(p.start_date),
            deadline: toLocalYMD(p.deadline),
            budget: p.total_budget == null ? "" : String(p.total_budget),
            assigned_to_name: p.assigned_to_rel?.username || "",
          });
          setInitialLoaded(true);
        }
      } catch (e) {
        if (!cancelled) toast.error(e?.message || "Failed to load project.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const canSubmit = useMemo(() => {
    if (!form.project_name?.trim()) return false;
    if (!form.status) return false;
    return true;
  }, [form]);

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) {
      toast.warning("Please fill required fields (name, status).");
      return;
    }

    const payload = {
      project_name: form.project_name.trim(),
      project_description: form.project_description || null,
      status: form.status,
      start_date: form.start_date || null,
      deadline: form.deadline || null,
      budget:
        String(form.budget).trim() === "" ? null : Number(form.budget), 
    };

    try {
      console.log(payload);
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects/details/${projectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.message || "Failed to update project.");
        return;
      }
      toast.success("Project updated successfully.");
      onOpenChange?.(false);
      router.refresh();
    } catch (e) {
      toast.error(e?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{`${
            form.budget === "" ? "Set" : "Update"
          } Project Budget`}</DialogTitle>
          <DialogDescription>
            View and update project details. Budget can be set or cleared.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pname" className="text-right">
              Name *
            </Label>
            <Input
              id="pname"
              className="col-span-3"
              value={form.project_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, project_name: e.target.value }))
              }
              placeholder="Project name"
            />
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="pdesc" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="pdesc"
              className="col-span-3"
              rows={3}
              value={form.project_description}
              onChange={(e) =>
                setForm((s) => ({ ...s, project_description: e.target.value }))
              }
              placeholder="Describe the project"
            />
          </div>

          {/* Team Lead (display only) */}
          {form.assigned_to_name ? (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Team Lead</Label>
              <Input
                className="col-span-3"
                value={form.assigned_to_name}
                readOnly
              />
            </div>
          ) : null}

          {/* Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Status *</Label>
            <Select
              value={form.status || undefined}
              onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pstart" className="text-right">
              Start Date
            </Label>
            <Input
              id="pstart"
              type="date"
              className="col-span-3"
              value={form.start_date}
              onChange={(e) =>
                setForm((s) => ({ ...s, start_date: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pdeadline" className="text-right">
              Deadline
            </Label>
            <Input
              id="pdeadline"
              type="date"
              className="col-span-3"
              value={form.deadline}
              onChange={(e) =>
                setForm((s) => ({ ...s, deadline: e.target.value }))
              }
            />
          </div>

          {/* Budget */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pbudget" className="text-right">
              Budget
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="pbudget"
                type="number"
                step="0.01"
                min="0"
                placeholder="Not set yet"
                value={form.budget}
                onChange={(e) =>
                  setForm((s) => ({ ...s, budget: e.target.value }))
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm((s) => ({ ...s, budget: "" }))}
                title="Clear budget"
              >
                Clear
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading || !initialLoaded}
            >
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
