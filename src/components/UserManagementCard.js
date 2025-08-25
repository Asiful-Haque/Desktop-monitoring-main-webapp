"use client";
import { usePathname } from "next/navigation";
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// helper to give badge color based on role
function getRoleColor(role) {
  switch (role) {
    case "Admin":
      return "bg-red-100 text-red-700";
    case "Developer":
      return "bg-green-100 text-green-700";
    case "Product Manager":
      return "bg-blue-100 text-blue-700";
    case "Team Lead":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function UserManagementCard({ users }) {
  const pathname = usePathname();
  console.log("usesrs data:", users);
  
  const usersArray = Array.isArray(users)
  ? users
  : users?.members && Array.isArray(users.members)
  ? users.members
  : [];

  console.log("Current path:", pathname);
  return (
    <Card
      className={`border-0 shadow-lg bg-white/70 backdrop-blur-sm ${
        pathname.includes("adminDashboard") ? "h-196" : "h-142"
      }`}
    >
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle
            className={
              pathname.includes("adminDashboard")
                ? "text-red-700"
                : "text-blue-700"
            }
          >
            {pathname.includes("adminDashboard")
              ? "User Management"
              : "Team Members"}
          </CardTitle>
          <CardDescription>
            {pathname.includes("adminDashboard")
              ? "Active users and their current roles"
              : "People working on this project"}
          </CardDescription>
        </div>

        {!pathname.includes("adminDashboard") && (
          <Button className="bg-red-600 hover:bg-red-700">
            Remove User
          </Button>
        )}
      </CardHeader>

      <CardContent className="overflow-y-auto h-full">
        <div className="space-y-4">
          {usersArray.map((user, i) => (
            <div
              key={i}
              className={
                pathname.includes("adminDashboard")
                  ? "flex items-center justify-between p-4 border border-blue-100 rounded-lg bg-blue-50/50"
                  : "flex items-center justify-between p-4 border border-blue-100 rounded-lg bg-blue-50/50"
              }
            >
              <div className="flex items-center space-x-3">
                <div
                  className={
                    pathname.includes("adminDashboard")
                      ? "w-10 h-10 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center text-white font-medium"
                      : "w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium"
                  }
                >
                  {user.username
                    ? user.username
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                    : ""}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.username}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <Badge className={getRoleColor(user.role_name)}>
                {user.role_name}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
