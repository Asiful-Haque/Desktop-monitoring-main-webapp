"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner"; 


const AddUserModal = ({ addUserModalOpen, setAddUserModalOpen }) => {
  // 📝 Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
    defaultRate: "", 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ❗ Field Validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.role ||
      !formData.password ||
      !formData.defaultRate
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
          default_hour_rate: parseFloat(formData.defaultRate), 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to create user");
        return;
      }

      const data = await res.json();
      console.log("User created:", data);

      // 🎉 Show success message
      toast.success(`User ${data.user.username} has been added successfully`);

      // 🔄 Reset form and close modal
      setFormData({
        name: "",
        email: "",
        role: "",
        password: "",
        defaultRate: "",
      });
      setAddUserModalOpen(false);
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error(error.message || "Something went wrong");
    }
  };

  // 🖼️ UI Structure
  return (
    <Dialog open={addUserModalOpen} onOpenChange={setAddUserModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account for your team member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="col-span-3"
                placeholder="Enter full name"
              />
            </div>

            {/* Email Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="col-span-3"
                placeholder="Enter email address"
              />
            </div>

            {/* Password Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="col-span-3"
                placeholder="Enter password"
              />
            </div>

            {/* Default Hourly Rate Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="defaultRate" className="text-right">
                Hourly Rate
              </Label>
              <Input
                id="defaultRate"
                type="number"
                step="0.01"
                value={formData.defaultRate}
                onChange={(e) =>
                  setFormData({ ...formData, defaultRate: e.target.value })
                }
                className="col-span-3"
                placeholder="Enter default hourly rate"
              />
            </div>

            {/* Role Dropdown */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="Team Lead">Team Lead</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Product Manager">
                    Product Manager
                  </SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer Buttons */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddUserModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Add User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
