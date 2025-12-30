"use client";

import React, { useMemo, useState } from "react";
import moment from "moment";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CheckSquare, Clock, AlertCircle, Plus, AlignLeft } from "lucide-react";

import AddTaskModal from "@/components/AddTaskModal";
import TaskDescriptionDialog from "@/components/TaskDescriptionDialog"; 

// Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  ChartTitle,
  Tooltip,
  Legend
);
const chartPalette = {
  status: {
    pending: "#F59E0B", 
    in_progress: "#3B82F6", 
    completed: "#22C55E", 
  },
  priority: {
    HIGH: "#EF4444",
    MEDIUM: "#F59E0B", 
    LOW: "#6B7280", 
  },
  bars: [
    "#6366F1",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#84CC16",
    "#8B5CF6",
    "#F43F5E",
    "#10B981",
    "#EAB308",
  ],
};

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

const formatDeadline = (deadline) => {
  if (!deadline) return "-";

  if (deadline.includes("T") || deadline.endsWith("Z")) {
    return moment.utc(deadline).local().format("YYYY-MM-DD HH:mm:ss");
  } else if (deadline.includes(" ")) {
    return moment.utc(deadline).local().format("YYYY-MM-DD HH:mm:ss");
  } else {
    return moment(deadline).format("YYYY-MM-DD");
  }
};

const formatSeconds = (val) => {
  const n = Number(val || 0);
  if (!n || n <= 0) return "0s";
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  return [h ? `${h}h` : null, m ? `${m}m` : null, s ? `${s}s` : null]
    .filter(Boolean)
    .join(" ");
};

const Tasks = ({ tasks: initialTasks, projects, curruser, allusers }) => {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState("ALL");
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [descOpen, setDescOpen] = useState(false);
  const [descTask, setDescTask] = useState(null);

  const handleSeeDetails = (taskId) =>
    router.push(`/task-screenshot/${taskId}`);

  const handleOpenDescription = (task) => {
    setDescTask(task);
    setDescOpen(true);
  };

  const handleSubmitForReview = async (taskId, status) => {
    try {
      const response = await fetch(`/api/tasks/task-update/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus: status }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to update task status");

      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === taskId ? { ...t, status: data.taskres.status } : t
        )
      );
    } catch (e) {
      console.error(e);
      alert("Failed to update task status");
    }
  };

  const filteredTasks = useMemo(() => {
    return selectedProject === "ALL"
      ? tasks
      : tasks.filter((t) => String(t.project_id) === String(selectedProject));
  }, [tasks, selectedProject]);

  const analytics = useMemo(() => {
    const secs = filteredTasks.map((t) => Number(t.last_timing || 0));
    const total = secs.reduce((a, b) => a + b, 0);
    const count = filteredTasks.length;
    const avg = count ? Math.round(total / count) : 0;

    const labels = filteredTasks.map((t) => t.task_name || `Task ${t.task_id}`);

    const statusTally = { pending: 0, in_progress: 0, completed: 0 };
    filteredTasks.forEach((t) => {
      const s = t.status || "pending";
      if (statusTally[s] !== undefined) statusTally[s] += 1;
    });

    const perTaskColors = filteredTasks.map((t, i) => {
      return (
        chartPalette.priority[t.priority] ||
        chartPalette.bars[i % chartPalette.bars.length]
      );
    });

    return {
      totalSeconds: total,
      avgSeconds: avg,
      taskCount: count,
      completedCount: statusTally.completed,
      perTaskLabels: labels,
      perTaskSeconds: secs,
      perStatusCounts: statusTally,
      perTaskColors,
    };
  }, [filteredTasks]);

  const barData = useMemo(
    () => ({
      labels: analytics.perTaskLabels,
      datasets: [
        {
          label: "Time Spent (seconds) per Task",
          data: analytics.perTaskSeconds,
          backgroundColor: analytics.perTaskColors,
          borderColor: analytics.perTaskColors,
          borderWidth: 1,
        },
      ],
    }),
    [analytics.perTaskLabels, analytics.perTaskSeconds, analytics.perTaskColors]
  );

  const doughnutData = useMemo(
    () => ({
      labels: ["Pending", "In Progress", "Completed"],
      datasets: [
        {
          label: "Tasks by Status",
          data: [
            analytics.perStatusCounts.pending,
            analytics.perStatusCounts.in_progress,
            analytics.perStatusCounts.completed,
          ],
          backgroundColor: [
            chartPalette.status.pending,
            chartPalette.status.in_progress,
            chartPalette.status.completed,
          ],
          borderColor: "#FFFFFF",
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    }),
    [analytics.perStatusCounts]
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        title: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const raw =
                typeof ctx.raw === "number" ? ctx.raw : Number(ctx.raw || 0);
              return ` ${formatSeconds(raw)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          title: { display: true, text: "Seconds" },
        },
        x: { ticks: { autoSkip: false } },
      },
    }),
    []
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || "";
              const v =
                typeof ctx.raw === "number" ? ctx.raw : Number(ctx.raw || 0);
              const total =
                analytics.perStatusCounts.pending +
                  analytics.perStatusCounts.in_progress +
                  analytics.perStatusCounts.completed || 1;
              const pct = Math.round((v * 100) / total);
              return ` ${label}: ${v} (${pct}%)`;
            },
          },
        },
      },
    }),
    [analytics.perStatusCounts]
  );

  const currentProjectName =
    selectedProject === "ALL"
      ? "All Projects"
      : projects.find((p) => String(p.project_id) === String(selectedProject))
          ?.project_name || "Project";

  return (
    <div
      className={`p-6 space-y-6 bg-gradient-to-br ${
        curruser.role === "Admin" ? "from-red-100" : "from-blue-50"
      } to-indigo-50 min-h-screen`}
    >
      <TaskDescriptionDialog
        open={descOpen}
        onOpenChange={(v) => {
          setDescOpen(v);
          if (!v) setDescTask(null);
        }}
        task={descTask}
      />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tasks</h1>

        {curruser.role !== "Project Manager" && (
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setAddTaskModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      <div className="mb-2">
        <label
          htmlFor="project-select"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Select Project
        </label>
        <Select
          value={selectedProject}
          onValueChange={(v) => setSelectedProject(v || "ALL")}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choose a project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Projects</SelectItem>
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

      <div className="grid grid-cols-1 gap-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">
              Time & Status Overview — {currentProjectName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <div className="text-xs text-muted-foreground">Total Time</div>
                <div className="text-lg font-semibold">
                  {formatSeconds(analytics.totalSeconds)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <div className="text-xs text-muted-foreground">Avg / Task</div>
                <div className="text-lg font-semibold">
                  {formatSeconds(analytics.avgSeconds)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <div className="text-xs text-muted-foreground">Tasks</div>
                <div className="text-lg font-semibold">
                  {analytics.taskCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <div className="text-xs text-muted-foreground">Completed</div>
                <div className="text-lg font-semibold">
                  {analytics.completedCount}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-64 lg:col-span-2 p-3 rounded-xl bg-white shadow-sm">
                <Bar data={barData} options={barOptions} />
              </div>
              <div className="h-64 p-3 rounded-xl bg-white shadow-sm">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>
          </CardContent>
        </Card>
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
            const StatusIcon = statusIcons[task.status] || Clock;

            return (
              <Card
                key={task.task_id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <CardTitle className="text-lg text-foreground truncate">
                        {task.task_name}
                      </CardTitle>

                      <button
                        type="button"
                        onClick={() => handleOpenDescription(task)}
                        className="cursor-pointer shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white hover:bg-gray-50 transition"
                        title="View description"
                        aria-label="View description"
                      >
                        <AlignLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>

                    {["Project Manager", "CEO", "Admin", "Team Lead"].includes(
                      curruser.role
                    ) ? (
                      <button
                        type="button"
                        className="shrink-0 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                        onClick={() => handleSeeDetails(task.task_id)}
                      >
                        See Details
                      </button>
                    ) : (
                      <div className="shrink-0 flex items-center gap-2">
                        <Badge className={priorityColors[task.priority]}>
                          {(task.priority || "").toUpperCase()}
                        </Badge>
                        <Badge className={statusColors[task.status]}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {(task.status || "").replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="text-sm text-gray-700 mb-2">
                    Time Spent:{" "}
                    <span className="font-medium">
                      {formatSeconds(task.last_timing)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    {["Project Manager", "CEO", "Team Lead", "Admin"].includes(
                      curruser.role
                    ) || ["pending", "completed"].includes(task.status) ? (
                      <div className="px-3 py-1" />
                    ) : (
                      <button
                        type="button"
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        onClick={() => {
                          const confirmed =
                            window.confirm("Submit for review?");
                          if (confirmed)
                            handleSubmitForReview(task.task_id, "pending");
                        }}
                      >
                        Submit for Review
                      </button>
                    )}

                    <span className="font-medium">
                      Due: <span>{formatDeadline(task.deadline)}</span>
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
        curruser={curruser}
        allusers={allusers}
      />
    </div>
  );
};

export default Tasks;
