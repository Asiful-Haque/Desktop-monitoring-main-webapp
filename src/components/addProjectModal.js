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
import { toast } from "sonner"; // ✅ Sonner toast

// 🧠 Component Definition
const AddProjectModal = ({ addProjectModalOpen, setAddProjectModalOpen }) => {
  // 📝 Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "", 
    deadline: "",
    status: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ❗ Field Validation
    if (
      !formData.name ||
      !formData.description ||
      !formData.email ||
      !formData.deadline ||
      !formData.status
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.name,
          description: formData.description,
          email: formData.email, 
          deadline: formData.deadline,
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to create project");
        return;
      }

      const data = await res.json();
      console.log("Project created:", data);

      // 🎉 Show success message
      toast.success(`Project ${data.project.title} has been added successfully`);

      // 🔄 Reset form and close modal
      setFormData({ name: "",description: "", email: "", deadline: "", status: "" });
      setAddProjectModalOpen(false);
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error(error.message || "Something went wrong");
    }
  };

  // 🖼️ UI Structure
  return (
    <Dialog open={addProjectModalOpen} onOpenChange={setAddProjectModalOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Create a new project for your team to work on.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-name" className="text-right">
                Name *
              </Label>
              <Input
                id="project-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="col-span-3"
                placeholder="Enter project name"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="col-span-3"
                placeholder="Enter project description"
                rows={3}
              />
            </div>
            {/* assigning persons Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Assigned By *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="col-span-3"
                placeholder="Enter email address"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deadline" className="text-right">
                Deadline *
              </Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status *
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">In progress</SelectItem>
                  <SelectItem value="medium">Pending</SelectItem>
                  <SelectItem value="high">Archieved</SelectItem>
                  <SelectItem value="critical">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
