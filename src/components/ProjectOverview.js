"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import moment from "moment";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";

const getStatusColor = (status) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "On Track":
      return "bg-blue-100 text-blue-800";
    case "At Risk":
      return "bg-red-100 text-red-800";
    case "Ahead":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatDeadline = (deadline) => {
  if (!deadline) return "-";

  // Check if it contains time + 'T' or 'Z' → TIMESTAMP/ISO string
  if (deadline.includes("T") || deadline.endsWith("Z")) {
    return moment.utc(deadline).local().format("YYYY-MM-DD ");
  } else if (deadline.includes(" ")) {
    // DATETIME (assume stored in UTC)
    return moment.utc(deadline).local().format("YYYY-MM-DD ");
  } else {
    // DATE only
    return moment(deadline).format("YYYY-MM-DD");
  }
};

function ProjectOverview({ projects }) {
  const router = useRouter();
  // console.log("Projects data:", projects);
  return (
    <div>
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-196">
        <CardHeader>
          <CardTitle className="text-red-700">Project Overview</CardTitle>
          <CardDescription>Current projects and their progress</CardDescription>
        </CardHeader>
        <CardContent className="overflow-y-auto h-full">
          <div className="space-y-4">
            {projects &&
              projects.map((project) => (
                <div
                  key={project.project_id}
                  className="p-4 border border-blue-100 rounded-lg bg-blue-50/50 cursor-pointer hover:bg-blue-100/50 transition-colors"
                  onClick={() =>
                    router.push(`/projectDetails/${project.project_id}`)
                  }
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {project.project_name}
                    </h4>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{project.assigned_to_rel.username}</span>
                      <p className="text-xs text-gray-500">
                        Deadline: {formatDeadline(project.deadline)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectOverview;
