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
import { toast } from "sonner";

const AddProjectModal = ({ addProjectModalOpen, setAddProjectModalOpen }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    start_date: "",
    deadline: "",
    status: "",
    client_name: "",
    project_type: "", // "fixed" | "hourly" | "developer_hour"
    total_budget: "",
    project_hour_rate: "",
  });

  const isFixed = formData.project_type === "fixed";
  const isHourly = formData.project_type === "hourly";
  const isDeveloperHour = formData.project_type === "developer_hour";

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validations
    if (
      !formData.name ||
      !formData.description ||
      !formData.email ||
      !formData.start_date ||
      !formData.deadline ||
      !formData.status ||
      !formData.project_type
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Conditional validations
    if (isFixed) {
      if (formData.total_budget === "" || isNaN(Number(formData.total_budget))) {
        toast.error("Please provide a valid Total Budget");
        return;
      }
    }
    if (isHourly) {
      if (
        formData.project_hour_rate === "" ||
        isNaN(Number(formData.project_hour_rate))
      ) {
        toast.error("Please provide a valid Project Hourly Rate");
        return;
      }
    }
    // For developer_hour: no extra fields needed (both will be null)

    // Prepare payload
    const payload = {
      name: formData.name,
      description: formData.description,
      email: formData.email,
      start_date: formData.start_date,
      deadline: formData.deadline,
      status: formData.status,
      client_name: formData.client_name || null,
      project_type: formData.project_type,
      total_budget: isFixed ? Number.parseFloat(formData.total_budget) : null,
      project_hour_rate: isHourly
        ? Number.parseFloat(formData.project_hour_rate)
        : null, // will be null for developer_hour
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || "Failed to create project");
        return;
      }

      const data = await res.json();
      toast.success(
        `Project ${
          data?.allprojects?.project_name || payload.name
        } has been added successfully`
      );

      setFormData({
        name: "",
        description: "",
        email: "",
        start_date: "",
        deadline: "",
        status: "",
        client_name: "",
        project_type: "",
        total_budget: "",
        project_hour_rate: "",
      });
      setAddProjectModalOpen(false);
    } catch (error) {
      console.error("Error adding project:", error);
      toast.error(error.message || "Something went wrong");
    }
  };

  return (
    <Dialog open={addProjectModalOpen} onOpenChange={setAddProjectModalOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Create a new project for your team to work on.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Project Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-name" className="text-right">
                Name *
              </Label>
              <Input
                id="project-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, name: e.target.value }))
                }
                className="col-span-3"
                placeholder="Enter project name"
              />
            </div>

            {/* Description */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, description: e.target.value }))
                }
                className="col-span-3"
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            {/* Client Name (optional) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client_name" className="text-right">
                Client Name
              </Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, client_name: e.target.value }))
                }
                className="col-span-3"
                placeholder="e.g., Acme Corp"
              />
            </div>

            {/* Team Lead (email) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Team Lead *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, email: e.target.value }))
                }
                className="col-span-3"
                placeholder="Enter email address"
              />
            </div>

            {/* Start Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Start Date *
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, start_date: e.target.value }))
                }
                className="col-span-3"
              />
            </div>

            {/* Deadline */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deadline" className="text-right">
                Deadline *
              </Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, deadline: e.target.value }))
                }
                className="col-span-3"
              />
            </div>

            {/* Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status *
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((s) => ({ ...s, status: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project_type" className="text-right">
                Project Type *
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.project_type}
                  onValueChange={(value) =>
                    setFormData((s) => ({
                      ...s,
                      project_type: value,
                      // Clear numeric fields when switching types so they become null in payload
                      total_budget:
                        value === "fixed" ? s.total_budget : "",
                      project_hour_rate:
                        value === "hourly" ? s.project_hour_rate : "",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Project hour basis</SelectItem>
                    <SelectItem value="developer_hour">Developer hour basis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional: Total Budget (for Fixed) */}
            {isFixed && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="total_budget" className="text-right">
                  Total Budget *
                </Label>
                <Input
                  id="total_budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_budget}
                  onChange={(e) =>
                    setFormData((s) => ({ ...s, total_budget: e.target.value }))
                  }
                  className="col-span-3"
                  placeholder="e.g., 50000.00"
                />
              </div>
            )}

            {/* Conditional: Project Hourly Rate (for Hourly) */}
            {isHourly && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project_hour_rate" className="text-right">
                  Hourly Rate *
                </Label>
                <Input
                  id="project_hour_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.project_hour_rate}
                  onChange={(e) =>
                    setFormData((s) => ({
                      ...s,
                      project_hour_rate: e.target.value,
                    }))
                  }
                  className="col-span-3"
                  placeholder="e.g., 120.00"
                />
              </div>
            )}
            {/* For developer_hour: no extra fields; both values remain empty -> null in payload */}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddProjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectModal;
