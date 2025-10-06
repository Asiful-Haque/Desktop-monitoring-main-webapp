"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, CheckSquare, Clock } from "lucide-react";
import EditProjectModal from "@/components/EditProjectModal";

function ProjOverviewCards({ project, teamCount, curruser }) {
  const [editOpen, setEditOpen] = useState(false);

  const norm = (project?.budget ?? "").toString().trim().toLowerCase();
  const hasBudget = norm !== "" && norm !== "not set yet" && norm !== "not set";
  const budgetButtonLabel = hasBudget ? "Update budget" : "Set budget";
  // console.log("Project in ProjOverviewCards----------------:", project);

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Progress */}
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <CheckSquare className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {project.progress}%
              </div>
              <Progress value={project.progress} className="mt-2 h-2" />
            </CardContent>
          </Card>

          {/* Team Size */}
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {teamCount}
              </div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>

          {/* Deadline */}
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deadline</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-purple-600">
                {project.deadline}
              </div>
              <p className="text-xs text-muted-foreground">Due date</p>
            </CardContent>
          </Card>

          {/* Budget + Action in Header (opens modal) */}
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Budget</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              {curruser?.role !== "Developer" && (
                <Button
                  size="sm"
                  className="mt-0 cursor-pointer"
                  onClick={() => setEditOpen(true)}
                >
                  {budgetButtonLabel}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-orange-600">
                {project.budget}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal */}
      <EditProjectModal
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={project.id}
      />
    </>
  );
}

export default ProjOverviewCards;
