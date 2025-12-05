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
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AddUserModal = ({ addUserModalOpen, setAddUserModalOpen }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
    defaultRate: "",
    paymentType: "",
    currency: "",
  });

  const isFreelancer = formData.role === "Freelancer";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.role ||
      !formData.password ||
      !formData.defaultRate ||
      (!isFreelancer && !formData.paymentType)
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const currencyTrimmed = formData.currency?.trim();

      const payload = {
        username: formData.name,
        email: formData.email,
        role: formData.role,
        password: formData.password,
        default_hour_rate: parseFloat(formData.defaultRate),
        currency: currencyTrimmed ? currencyTrimmed.toUpperCase() : null,
      };

      if (!isFreelancer) {
        payload.salary_type = formData.paymentType;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorData = {};
        try {
          errorData = await res.json();
        } catch (err) {}
        toast.error(errorData.message || "Failed to create user");
        return;
      }

      const data = await res.json();
      toast.success(`User ${data.user.username} has been added successfully`);

      setFormData({
        name: "",
        email: "",
        role: "",
        password: "",
        defaultRate: "",
        paymentType: "",
        currency: "",
      });
      setAddUserModalOpen(false);
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error(error?.message || "Something went wrong");
    }
  };

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
            {/* Name */}
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

            {/* Email */}
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

            {/* Password */}
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

            {/* Hourly Rate */}
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

            {/* Currency */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                Currency
              </Label>

              <div className="col-span-3 relative">
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currency: (e.target.value || "").toUpperCase(),
                    })
                  }
                  placeholder="e.g. USD, BDT"
                  maxLength={3}
                  className="pr-10"
                  inputMode="text"
                />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Currency help"
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[260px] text-sm leading-snug">
                      Use the <b>ISO 4217</b> currency code (3 letters), e.g.{" "}
                      <b>USD</b>, <b>EUR</b>, <b>GBP</b>, <b>BDT</b>. Don’t type
                      country names like “USA”.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Role */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    role: value,
                    paymentType:
                      value === "Freelancer" ? "" : formData.paymentType,
                  })
                }
              >
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="Team Lead">Team Lead</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Product Manager">Product Manager</SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Salary Type – hidden for Freelancer */}
            {!isFreelancer && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentType" className="text-right">
                  Salary Type
                </Label>
                <Select
                  value={formData.paymentType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentType: value })
                  }
                >
                  <SelectTrigger id="paymentType" className="col-span-3">
                    <SelectValue placeholder="Select salary type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

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
