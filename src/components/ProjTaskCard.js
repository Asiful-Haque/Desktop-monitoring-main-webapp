import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ProjTaskCard({ tasks }) {
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

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-blue-700">Project Tasks</CardTitle>
        <CardDescription>Current tasks and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.task_id}
              className="flex items-center justify-between p-4 border border-blue-100 rounded-lg bg-blue-50/50"
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{task.task_name}</h4>
                <p className="text-sm text-gray-600">
                  Assigned to: {task.assigned_to_rel.username}
                </p>
                <p className="text-xs text-gray-500">Due: {task.dueDate}</p>
              </div>
              <Badge className={getStatusColor(task.status)}>
                {task.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProjTaskCard;
