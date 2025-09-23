"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const AssignUserToProjectModal = ({
  assignModalOpen,
  setAssignModalOpen,
  users = [],
  projects = [],
  onAssign,
}) => {
  const [formData, setFormData] = useState({
    user_id: "",
    project_id: "",
    user_rate_for_this_project: "",
  });
  const [loading, setLoading] = useState(false);
  const [rateEditable, setRateEditable] = useState(false);

  const selectedUser = useMemo(() => {
    const id = Number(formData.user_id);
    if (!id) return null;
    return users.find((u) => Number(u.user_id ?? u.id) === id) || null;
  }, [formData.user_id, users]);

  const selectedProject = useMemo(() => {
    const id = Number(formData.project_id);
    if (!id) return null;
    return projects.find((p) => Number(p.project_id ?? p.id) === id) || null;
  }, [formData.project_id, projects]);

  const shouldShowRate =
    selectedProject?.project_type === "developer_hour" && !!selectedUser;

  // Track previous selections to detect actual changes
  const prevUserIdRef = useRef(formData.user_id);
  const prevProjectIdRef = useRef(formData.project_id);

  // Helper: get default rate from user
  const getDefaultRate = (user) => {
    const v = user?.default_hour_rate ?? user?.hour_rate ?? null;
    return v == null ? "" : String(v);
  };

  // Effect 1: If project is not developer_hour, clear and lock rate
  useEffect(() => {
    if (!shouldShowRate) {
      setFormData((s) => ({ ...s, user_rate_for_this_project: "" }));
      setRateEditable(false);
    }
  }, [shouldShowRate]);

  // Effect 2: When the project changes, if developer_hour, auto-fill from selected user's default and lock
  useEffect(() => {
    const currentProjectId = formData.project_id;
    const prevProjectId = prevProjectIdRef.current;

    if (currentProjectId !== prevProjectId) {
      prevProjectIdRef.current = currentProjectId;

      if (shouldShowRate) {
        setFormData((s) => ({
          ...s,
          user_rate_for_this_project: getDefaultRate(selectedUser),
        }));
        setRateEditable(false);
      } else {
        setFormData((s) => ({ ...s, user_rate_for_this_project: "" }));
        setRateEditable(false);
      }
    }
  }, [formData.project_id, shouldShowRate, selectedUser]);

  // Effect 3: When the user changes (and project requires rate), reset to that user's default and lock
  useEffect(() => {
    const currentUserId = formData.user_id;
    const prevUserId = prevUserIdRef.current;

    if (currentUserId !== prevUserId) {
      prevUserIdRef.current = currentUserId;

      if (shouldShowRate) {
        setFormData((s) => ({
          ...s,
          user_rate_for_this_project: getDefaultRate(selectedUser),
        }));
        setRateEditable(false);
      } else {
        setFormData((s) => ({ ...s, user_rate_for_this_project: "" }));
        setRateEditable(false);
      }
    }
  }, [formData.user_id, shouldShowRate, selectedUser]);

  const reset = () => {
    setFormData({ user_id: "", project_id: "", user_rate_for_this_project: "" });
    setRateEditable(false);
    setLoading(false);
    prevUserIdRef.current = "";
    prevProjectIdRef.current = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.user_id || !formData.project_id) {
      toast.error("Please select both a user and a project");
      return;
    }

    let rateToSend = null;
    if (shouldShowRate) {
      // Use the current input value (which is default unless user edited)
      if (formData.user_rate_for_this_project === "") {
        toast.error("Please provide an Hour Rate for this assignment");
        return;
      }
      const n = Number(formData.user_rate_for_this_project);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Please enter a valid Hour Rate");
        return;
      }
      rateToSend = n;
    }

    try {
      setLoading(true);

      const payload = {
        user_id: Number(formData.user_id),
        project_id: Number(formData.project_id),
        user_rate_for_this_project: shouldShowRate ? rateToSend : null,
      };

      if (typeof onAssign === "function") {
        await onAssign(payload);
      } else {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/team-member/${formData.project_id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to assign user to project");
        }
      }

      toast.success("User assigned to project successfully");
      reset();
      setAssignModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add User to Project</DialogTitle>
          <DialogDescription>
            Choose a user and a project to create an assignment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* User */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user" className="text-right">
                User *
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.user_id}
                  onValueChange={(val) =>
                    setFormData((p) => ({ ...p, user_id: val }))
                  }
                >
                  <SelectTrigger id="user" className="w-full">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 overflow-y-auto">
                    {users.map((u) => {
                      const id = String(u.user_id ?? u.id);
                      const label =
                        u.name || u.full_name || u.email || `User #${id}`;
                      return (
                        <SelectItem key={id} value={id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project" className="text-right">
                Project *
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.project_id}
                  onValueChange={(val) =>
                    setFormData((p) => ({ ...p, project_id: val }))
                  }
                >
                  <SelectTrigger id="project" className="w-full">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 overflow-y-auto">
                    {projects.map((p) => {
                      const id = String(p.project_id ?? p.id);
                      const label = p.project_name || p.name || `Project #${id}`;
                      return (
                        <SelectItem key={id} value={id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedProject?.project_type && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Type: {selectedProject.project_type}
                  </p>
                )}
              </div>
            </div>

            {/* Hour Rate (only when project_type is developer_hour) */}
            {shouldShowRate && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="user_rate_for_this_project" className="text-right">
                  Hour Rate
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    id="user_rate_for_this_project"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.user_rate_for_this_project}
                    onChange={(e) =>
                      setFormData((s) => ({
                        ...s,
                        user_rate_for_this_project: e.target.value,
                      }))
                    }
                    disabled={!rateEditable}
                    placeholder={
                      selectedUser?.default_hour_rate != null
                        ? String(selectedUser.default_hour_rate)
                        : "Set an hour rate"
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant={rateEditable ? "secondary" : "outline"}
                    onClick={() => setRateEditable((v) => !v)}
                  >
                    {rateEditable ? "Done" : "Edit rate"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setAssignModalOpen(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignUserToProjectModal;
