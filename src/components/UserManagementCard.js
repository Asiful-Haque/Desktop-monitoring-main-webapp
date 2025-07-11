"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-196">
      <CardHeader>
        <CardTitle className="text-red-700">User Management</CardTitle>
        <CardDescription>
          Active users and their current roles
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-y-auto h-full">
        <div className="space-y-4">
          {users.map((user, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                  {user.username
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.username}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
