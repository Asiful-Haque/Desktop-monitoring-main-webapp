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

function ProjTaskCard({ tasks: initialTasks, curruser }) {
  const [tasks, setTasks] = useState(initialTasks);
  

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
      <CardHeader>
        <CardTitle className="text-blue-700">Project Tasks</CardTitle>
        <CardDescription>Current tasks and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* {console.log("Tasks:", tasks)} */}
          {tasks.map((task) => (
            <div
              key={task.task_id}
              className="relative p-4 border border-blue-100 rounded-lg bg-blue-50/50"
            >
              {/* Status badge top-right */}
              <div className="absolute top-4 right-4">
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>

              {/* Task info */}
              <div className="mb-2">
                <h4 className="font-medium text-gray-900">{task.task_name}</h4>
                <p className="text-sm text-gray-600">
                  Assigned to: {task.assigned_to_name || "N/A"}
                </p>
                <p className="text-xs text-gray-500">
                  Due: {task.deadline?.split("T")[0] || "N/A"}
                </p>
              </div>

              {/* Button below due date */}
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



