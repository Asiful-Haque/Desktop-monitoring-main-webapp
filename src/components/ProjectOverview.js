"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

function ProjectOverview({ projects }) {
//   const fetchProjects = async () => {
//     const res = await fetch("/api/projects");
//     const data = await res.json();
//     if (!res.ok) throw new Error(data.error || "Failed to fetch projects");
//     return data.projects;
//   };

//   const {
//     data: projects,
//     isLoading,
//     isError,
//     error,
//   } = useQuery({
//     queryKey: ["projects"],
//     queryFn: fetchProjects,
//     staleTime: 1000 * 60,
//     refetchOnWindowFocus: false,
//   });

//   if (isLoading) {
//     return (
//       <p className="text-sm text-gray-500 p-4">Loading project overview...</p>
//     );
//   }

//   if (isError) {
//     return <p className="text-sm text-red-500 p-4">Error: {error.message}</p>;
//   }
  console.log("Projects data:", projects);
  return (
    <div>
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-196">
        <CardHeader>
          <CardTitle className="text-red-700">Project Overview</CardTitle>
          <CardDescription>Current projects and their progress</CardDescription>
        </CardHeader>
        <CardContent className="overflow-y-auto h-full">
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.project_id}
                className="p-4 border border-red-100 rounded-lg bg-red-50/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{project.project_name}</h4>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{project.assigned_to_rel.username}</span>
                    <span>{project.progress}% complete</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                  <p className="text-xs text-gray-500">
                    Deadline: {project.deadline}
                  </p>
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
