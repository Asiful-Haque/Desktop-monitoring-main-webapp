"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, AlertCircle, Plus } from "lucide-react";
import AddTaskModal from "@/components/AddTaskModal";

// Status, priority styles and icons
const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
};

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800 border-gray-200",
  MEDIUM: "bg-orange-100 text-orange-800 border-orange-200",
  HIGH: "bg-red-100 text-red-800 border-red-200",
};

const statusIcons = {
  pending: Clock,
  in_progress: AlertCircle,
  completed: CheckSquare,
};

const Tasks = ({ tasks, projects }) => {
  const [selectedProject, setSelectedProject] = useState("default-project");
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);

  //console.log("Selected project is now ", selectedProject);
  // Filter tasks based on selected project
  const filteredTasks =
    selectedProject === "default-project"
      ? tasks
      : tasks.filter((task) => task.project_rel.project_id === selectedProject);

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-red-50 to-pink-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setAddTaskModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="mb-6">
        <label
          htmlFor="project-select"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Select Project
        </label>
        <Select value={selectedProject === "default-project" ? "" : selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choose a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.project_id} value={project.project_id}>
                {project.project_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No task is assigned yet.
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const StatusIcon = statusIcons[task.status];
            return (
              <Card
                key={task.task_id}
                className="hover:shadow-md transition-shadow "
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-foreground">
                      {task.task_name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority.toUpperCase()}
                      </Badge>
                      <Badge className={statusColors[task.status]}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {task.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Assigned to:{" "}
                      <span className="font-medium">
                        {task.assigned_to_rel.username}
                      </span>
                    </span>
                    <span>
                      Due:{" "}
                      <span className="font-medium">
                        {new Date(task.deadline).toISOString().split("T")[0]}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      <AddTaskModal
        projects={projects}
        addTaskModalOpen={addTaskModalOpen}
        setAddTaskModalOpen={setAddTaskModalOpen}
      />
    </div>
  );
};

export default Tasks;
