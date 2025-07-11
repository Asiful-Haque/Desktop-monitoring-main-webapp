
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Activity,
  Shield,
  AlertTriangle,
  Plus,
  Settings,
} from "lucide-react";
import ProjectOverview from "@/components/ProjectOverview";
import { useQuery } from "@tanstack/react-query";
import UserManagementCard from "@/components/UserManagementCard";

export default async function AdminDashboard() {

  const systemStats = [
    { label: "Total Users", value: "127", change: "+12%", icon: Users },
    { label: "Active Projects", value: "23", change: "+8%", icon: Activity },
    { label: "System Uptime", value: "99.9%", change: "0%", icon: Shield },
    { label: "Issues", value: "3", change: "-40%", icon: AlertTriangle },
  ];

  const res1 = await fetch("http://localhost:5000/api/users",{
    method: 'GET',
    cache: "no-store",
  });
  if (!res1.ok) {
    throw new Error("Failed to fetch projects");
  }
  const { users } = await res1.json();
  console.log("Users data:", users);


  // const fetchProjects = async () => {
  //   const res = await fetch("/api/projects");
  //   const data = await res.json();
  //   if (!res.ok) throw new Error(data.error || "Failed to fetch projects");
  //   return data;
  // };

  // const {
  //   data: projects,
  //   isLoading: isProjectsLoading,
  //   isError,
  //   error,
  // } = useQuery({
  //   queryKey: ["projects"],
  //   queryFn: fetchProjects,
  //   staleTime: 1000 * 60*5,
  // });

  const res2 = await fetch("http://localhost:5000/api/projects",{
    method: 'GET',
    cache: "no-store",
  });
  if (!res2.ok) {
    throw new Error("Failed to fetch projects");
  }
  const { projects } = await res2.json();
  console.log("Projs data:", projects);

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
          <Button className="bg-red-600 hover:bg-red-700">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
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
        {/* User Management */}
        <UserManagementCard users={users} />

        {/* Project Overview */}
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
    </div>
  );
};


