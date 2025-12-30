"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlignLeft } from "lucide-react";

import TaskDescriptionDialog from "@/components/TaskDescriptionDialog"; 

function ProjTaskCard({ tasks: initialTasks, curruser }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [descOpen, setDescOpen] = useState(false);
  const [descTask, setDescTask] = useState(null);

  const openDescription = (task) => {
    setDescTask(task);
    setDescOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleMarkAsDone = async (taskId, status) => {
    const confirmed = window.confirm(
      "Are you sure you want to mark this task as completed?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/tasks/task-update/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus: status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");

      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === taskId ? { ...t, status: data.taskres.status } : t
        )
      );
    } catch (error) {
      console.error("Failed to mark task as done:", error);
      alert("Failed to update task status");
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <TaskDescriptionDialog
        open={descOpen}
        onOpenChange={(v) => {
          setDescOpen(v);
          if (!v) setDescTask(null);
        }}
        task={descTask}
      />

      <CardHeader>
        <CardTitle className="text-blue-700">Project Tasks</CardTitle>
        <CardDescription>Current tasks and their status</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.task_id}
              className="relative p-4 border border-blue-100 rounded-lg bg-blue-50/50"
            >
              <div className="absolute top-4 right-4">
                <Badge className={getStatusColor(task.status)}>
                  {String(task.status || "")
                    .replace("_", " ")
                    .toUpperCase()}
                </Badge>
              </div>

              <div className="mb-2 pr-12">
                <div className="flex items-center gap-2 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {task.task_name}
                  </h4>

                  <button
                    type="button"
                    onClick={() => openDescription(task)}
                    className="cursor-pointer shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white hover:bg-gray-50 transition"
                    title="View description"
                    aria-label="View description"
                  >
                    <AlignLeft className="h-4 w-4 text-gray-600" />
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  Assigned to: {task.assigned_to_name || "N/A"}
                </p>
                <p className="text-xs text-gray-500">
                  Due: {task.deadline?.split("T")[0] || "N/A"}
                </p>
              </div>

              {task.status === "pending" && curruser.role === "Team Lead" && (
                <div>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white text-sm mt-2"
                    onClick={() => handleMarkAsDone(task.task_id, "completed")}
                  >
                    Mark as Done
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProjTaskCard;
