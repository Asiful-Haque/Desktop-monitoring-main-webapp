"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarDays,
  Clock,
  DollarSign,
  Briefcase,
  TrendingUp,
  Award,
} from "lucide-react";
import Image from "next/image";

/* ---------- chart.js ---------- */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

/* ---------- colorful helpers ---------- */
const PALETTE = [
  "#6366F1", // indigo
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#06B6D4", // cyan
  "#8B5CF6", // violet
  "#84CC16", // lime
  "#EC4899", // pink
];
const textOn = "#ffffff";
const subtleGrid = "rgba(148,163,184,0.25)";
const subtleTick = "rgba(100,116,139,0.9)";

function hexToRgba(hex, a = 1) {
  const m = hex.replace("#", "");
  const bigint = parseInt(
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m,
    16
  );
  const r = (bigint >> 16) & 255,
    g = (bigint >> 8) & 255,
    b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* simple colorful progress (instead of shadcn Progress to color each row) */
function ColorBar({ value, color }) {
  return (
    <div className="h-2 w-full rounded-full bg-[rgba(0,0,0,0.08)] overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${hexToRgba(
            color,
            0.7
          )} 0%, ${color} 100%)`,
        }}
      />
    </div>
  );
}

const Profile = () => {
  const profileData = {
    name: "Asiful Haque",
    email: "asiful@example.com",
    role: "developer",
    avatar: "",
    hourRate: 75,
    totalHours: 1250,
    completedProjects: 23,
    activeProjects: 5,
    efficiency: 92,
    joinDate: "2023-01-15",
  };

  const assignedProjects = [
    {
      id: 1,
      name: "E-commerce Platform",
      status: "In Progress",
      completion: 75,
      priority: "High",
    },
    {
      id: 2,
      name: "Mobile App Redesign",
      status: "Completed",
      completion: 100,
      priority: "Medium",
    },
    {
      id: 3,
      name: "Dashboard Analytics",
      status: "In Progress",
      completion: 45,
      priority: "High",
    },
    {
      id: 4,
      name: "API Integration",
      status: "Planning",
      completion: 10,
      priority: "Low",
    },
    {
      id: 5,
      name: "Security Audit",
      status: "In Progress",
      completion: 60,
      priority: "Critical",
    },
  ];

  const monthlyHours = [
    { month: "Jan", hours: 160 },
    { month: "Feb", hours: 145 },
    { month: "Mar", hours: 170 },
    { month: "Apr", hours: 155 },
    { month: "May", hours: 180 },
    { month: "Jun", hours: 165 },
  ];

  const skillsData = [
    { name: "React", value: 95 },
    { name: "TypeScript", value: 88 },
    { name: "Node.js", value: 82 },
    { name: "Python", value: 75 },
    { name: "AWS", value: 70 },
  ].map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }));

  /* ---- CHARTS: bright colors ---- */
  const lineStroke = PALETTE[0];
  const lineFill = hexToRgba(lineStroke, 0.25);

  const lineData = {
    labels: monthlyHours.map((m) => m.month),
    datasets: [
      {
        label: "Hours",
        data: monthlyHours.map((m) => m.hours),
        borderColor: lineStroke,
        backgroundColor: lineFill,
        pointBackgroundColor: PALETTE[2],
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: PALETTE[2],
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { intersect: false, mode: "index" },
    },
    scales: {
      x: { grid: { color: subtleGrid }, ticks: { color: subtleTick } },
      y: { grid: { color: subtleGrid }, ticks: { color: subtleTick } },
    },
  };

  const doughnutColors = PALETTE.slice(0, 4);
  const projectStatusData = [
    { name: "Completed", value: 12, color: doughnutColors[0] },
    { name: "In Progress", value: 5, color: doughnutColors[1] },
    { name: "Planning", value: 3, color: doughnutColors[2] },
    { name: "On Hold", value: 2, color: doughnutColors[3] },
  ];

  const doughnutData = {
    labels: projectStatusData.map((d) => d.name),
    datasets: [
      {
        data: projectStatusData.map((d) => d.value),
        backgroundColor: projectStatusData.map((d) => d.color),
        hoverBackgroundColor: projectStatusData.map((d) =>
          hexToRgba(d.color, 0.85)
        ),
        borderWidth: 0,
      },
    ],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: "60%",
  };

  /* colorful chips */
  const priorityColor = {
    Critical: PALETTE[3],
    High: PALETTE[0],
    Medium: PALETTE[2],
    Low: PALETTE[1],
  };
  const statusColor = {
    Completed: PALETTE[0],
    "In Progress": PALETTE[1],
    Planning: PALETTE[2],
    "On Hold": PALETTE[3],
  };
  const Chip = ({ label, color }) => (
    <span
      className="px-2 py-0.5 text-xs rounded-full font-medium"
      style={{ background: color, color: textOn }}
    >
      {label}
    </span>
  );
  

  return (
    <div className="p-6 space-y-6 bg-background bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1 relative overflow-hidden">
          <Image
            src="/A2.jpg"
            alt={profileData.name}
            fill
            className="object-cover object-[180%_0%]"
            priority
          />

          {/* Dark gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-black/20" />
          <CardHeader className="relative z-10 p-6 lg:p-8">
            <div className="flex items-center space-x-4">
              <div className="ring-2 ring-white/70 rounded-full">
                <Avatar className="w-20 h-20 shadow-lg">
                  <AvatarImage
                    src={profileData.avatar}
                    alt={profileData.name}
                  />
                  <AvatarFallback className="text-2xl">
                    {profileData.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white">
                  {profileData.name}
                </h1>
                <div className="flex items-center gap-3">
                  <Badge className="capitalize bg-white/90 text-black hover:bg-white">
                    {String(profileData.role).replace("_", " ")}
                  </Badge>
                  <div className="flex items-center text-white/80">
                    <CalendarDays className="w-4 h-4 mr-1" />
                    Joined {new Date(profileData.joinDate).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-white/80">{profileData.email}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 lg:w-80">
          <Card className="rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: hexToRgba(PALETTE[0], 0.15) }}
                >
                  <DollarSign
                    className="w-5 h-5"
                    style={{ color: PALETTE[0] }}
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold">${profileData.hourRate}</p>
                  <p className="text-sm text-muted-foreground">Hour Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: hexToRgba(PALETTE[1], 0.15) }}
                >
                  <Clock className="w-5 h-5" style={{ color: PALETTE[1] }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profileData.totalHours}</p>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: hexToRgba(PALETTE[2], 0.15) }}
                >
                  <Briefcase
                    className="w-5 h-5"
                    style={{ color: PALETTE[2] }}
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {profileData.completedProjects}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: hexToRgba(PALETTE[3], 0.15) }}
                >
                  <Award className="w-5 h-5" style={{ color: PALETTE[3] }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {profileData.efficiency}%
                  </p>
                  <p className="text-sm text-muted-foreground">Efficiency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Hours Trend
            </CardTitle>
            <CardDescription>
              Your working hours over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line data={lineData} options={lineOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of your current project statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {projectStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skills / Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Skills Proficiency</CardTitle>
            <CardDescription>Your technical skill levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillsData.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-muted-foreground">{s.value}%</span>
                </div>
                <ColorBar value={s.value} color={s.color} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assigned Projects</CardTitle>
            <CardDescription>
              Your current project assignments and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedProjects.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-4 border border-border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    <div className="flex gap-2">
                      <Chip
                        label={p.priority}
                        color={
                          priorityColor[p.priority] ||
                          PALETTE[(idx + 2) % PALETTE.length]
                        }
                      />
                      <Chip
                        label={p.status}
                        color={
                          statusColor[p.status] ||
                          PALETTE[(idx + 4) % PALETTE.length]
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{p.completion}%</span>
                    </div>
                    <ColorBar
                      value={p.completion}
                      color={PALETTE[(idx + 1) % PALETTE.length]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
