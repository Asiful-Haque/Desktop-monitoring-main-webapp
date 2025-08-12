"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const AssignUserToProjectModal = ({
  assignModalOpen,
  setAssignModalOpen,
  users = [],
  projects = [],
  onAssign,
}) => {

  const [formData, setFormData] = useState({ user_id: "", project_id: "" });
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setFormData({ user_id: "", project_id: "" });
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id || !formData.project_id) {
      toast.error("Please select both a user and a project");
      return;
    }

    try {
      setLoading(true);
      

      if (typeof onAssign === "function") {
        await onAssign({
          user_id: Number(formData.user_id),
          project_id: Number(formData.project_id),
        });
      } else {
        const res = await fetch(
          `http://localhost:5000/api/team-member/${formData.project_id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: Number(formData.user_id),
              project_id: Number(formData.project_id),
            }),
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
      <DialogContent className="sm:max-w-[500px]">
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
              <Select
                value={formData.user_id}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, user_id: val }))
                }
              >
                <SelectTrigger id="user" className="col-span-3">
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

            {/* Project */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project" className="text-right">
                Project *
              </Label>
              <Select
                value={formData.project_id}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, project_id: val }))
                }
              >
                <SelectTrigger id="project" className="col-span-3">
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
            </div>
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
