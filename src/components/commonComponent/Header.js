"use client";
import React from "react";
// import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, LogOut, Settings, User } from "lucide-react";

const Header = ({ user }) => {
    const { name, role } = user || {};
    console.log("Header user:", name, role);
  const getRoleColor = (role) => {
    switch (role) {
      case "Developer":
        return "text-green-600";
      case "Admin":
        return "text-red-600";
      case "Product_manager":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getRoleName = (role) => {
    if (!role) return "Unknown";
    switch (role) {
      case "product_manager":
        return "Product Manager";
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };
  const router = useRouter();
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">TaskFlow Pro</h1>
            <p className="text-sm text-gray-500">Internal Task Monitoring</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {user && (
            <>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className={`text-xs ${getRoleColor(user.role)}`}>
                  {getRoleName(user.role)}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        {user?.name
                          ? user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                          : "NA"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Switch Role (Demo)</DropdownMenuLabel>
                  <DropdownMenuItem
                    className="cursor-pointer text-green-600"
                    onClick={() => router.push("/")}
                  >
                    Developer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    onClick={() => router.push("/")}
                  >
                    Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-blue-600"
                    onClick={() => router.push("/")}
                  >
                    Project Manager
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-yellow-600"
                    onClick={() => router.push("/")}
                  >
                    CEO
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-lime-600"
                    onClick={() => router.push("/")}
                  >
                    Team Lead
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    // onClick={logout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
