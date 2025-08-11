"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Activity,
  Shield,
  AlertTriangle,
  Plus,
  FolderPlus,
  Settings,
} from "lucide-react";

import ProjectOverview from "@/components/ProjectOverview";
import UserManagementCard from "@/components/UserManagementCard";
import AddUserModal from "@/components/AddUserModal";
import AddProjectModal from "@/components/addProjectModal";

export default function AdminDashboardClient({ users, projects }) {
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);

  const systemStats = [
    { label: "Total Users", value: users.length, change: "+12%", icon: Users },
    { label: "Active Projects", value: projects.length, change: "+8%", icon: Activity },
    { label: "System Uptime", value: "99.9%", change: "0%", icon: Shield },
    { label: "Issues", value: "3", change: "-40%", icon: AlertTriangle },
  ];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-red-50 to-pink-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            System overview, user management, and analytics
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => setAddUserModalOpen(true)}
          >
            <Plus className=" h-4 w-4" />
            Add User
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setAddProjectModalOpen(true)}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
          <Button variant="outline">
            <Settings className=" h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {systemStats.map((stat, index) => (
          <Card
            key={index}
            className="border-0 shadow-lg bg-white/70 backdrop-blur-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                <span
                  className={
                    stat.change.startsWith("+")
                      ? "text-green-600"
                      : stat.change.startsWith("-")
                      ? "text-red-600"
                      : "text-gray-600"
                  }
                >
                  {stat.change}
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserManagementCard users={users} />
        <ProjectOverview projects={projects} />
      </div>

      {/* System Health */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-red-700">System Health</CardTitle>
          <CardDescription>
            Real-time system performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                98.5%
              </div>
              <p className="text-sm text-gray-600">CPU Usage</p>
              <Progress value={98.5} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">76%</div>
              <p className="text-sm text-gray-600">Memory Usage</p>
              <Progress value={76} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">45%</div>
              <p className="text-sm text-gray-600">Storage Usage</p>
              <Progress value={45} className="mt-2 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <AddUserModal addUserModalOpen={addUserModalOpen} setAddUserModalOpen={setAddUserModalOpen} />
      <AddProjectModal addProjectModalOpen={addProjectModalOpen} setAddProjectModalOpen={setAddProjectModalOpen} />
    </div>
  );
}
