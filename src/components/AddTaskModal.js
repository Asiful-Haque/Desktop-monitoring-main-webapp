"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const statusOptions = ["pending", "in_progress", "completed"];
const priorityOptions = ["low", "medium", "high"];

const AddTaskModal = ({
  projects,
  addTaskModalOpen,
  setAddTaskModalOpen,
  curruser,
  allusers,
}) => {
  console.log("All users in Modal:", allusers);
  const userOptions = [{ id: curruser.id, name: curruser.name }];
  //console.log("Projects in AddTaskModal:", projects);
  const [formData, setFormData] = useState({
    task_name: "",
    task_description: "",
    assigned_to: "",
    start_date: "",
    deadline: "",
    status: "",
    project_name: "",
    priority: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (
      !formData.task_name ||
      !formData.task_description ||
      !formData.assigned_to ||
      !formData.start_date ||
      !formData.deadline ||
      !formData.status ||
      !formData.project_name ||
      !formData.priority
    ) {
      toast.error("Please fill in all fields");
      return;
    }
    //console.log("Posting with ", formData);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to create task");
        return;
      }

      const data = await res.json();
      //.log("Task created:", data.task);

      toast.success(
        `Task "${data.task.task_name}" has been added successfully`
      );

      setFormData({
        task_name: "",
        task_description: "",
        assigned_to: "",
        start_date: "",
        deadline: "",
        status: "",
        project_name: "",
        priority: "",
      });
      setAddTaskModalOpen(false);
    } catch (error) {
      //console.error("Error adding task:", error);
      toast.error(error.message || "Something went wrong");
    }
  };

  return (
    <Dialog open={addTaskModalOpen} onOpenChange={setAddTaskModalOpen}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden ">
        {/* Colored header */}
        <div className="bg-amber-900 text-white px-6 py-4 flex flex-col items-start">
          <DialogTitle className="!text-2xl !font-bold !text-white">
            Add New Task
          </DialogTitle>
          <DialogDescription className="!text-base !text-white opacity-90">
            Create a new task for your project.
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task_name" className="text-right">
                Task Name
              </Label>
              <Input
                id="task_name"
                value={formData.task_name}
                onChange={(e) =>
                  setFormData({ ...formData, task_name: e.target.value })
                }
                className="col-span-3"
                placeholder="Enter task name"
              />
            </div>

            {/* Task Description */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task_description" className="text-right">
                Description
              </Label>
              <Input
                id="task_description"
                value={formData.task_description}
                onChange={(e) =>
                  setFormData({ ...formData, task_description: e.target.value })
                }
                className="col-span-3"
                placeholder="Enter task description"
              />
            </div>

            {/* Assigned To */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assigned_to" className="text-right">
                Assigned To
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, assigned_to: value })
                }
                value={formData.assigned_to}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {" "}
                  {curruser.role === "Developer"
                    ? userOptions.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name}
                        </SelectItem>
                      ))
                    : Object.values(allusers)
                        .flat()
                        .map((user) => (
                          <SelectItem
                            key={user.user_id}
                            value={String(user.user_id)}
                          >
                            {user.username}
                          </SelectItem>
                        ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Start Date
              </Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className="col-span-3"
              />
            </div>

            {/* Deadline */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deadline" className="text-right">
                Deadline
              </Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
                className="col-span-3"
              />
            </div>

            {/* Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                value={formData.status}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project_name" className="text-right">
                Project Name
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, project_name: value })
                }
                value={formData.project_name}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem
                      key={project.project_id}
                      value={String(project.project_id)}
                    >
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
                value={formData.priority}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddTaskModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-900 hover:bg-amber-800">
                Add Task
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskModal;
