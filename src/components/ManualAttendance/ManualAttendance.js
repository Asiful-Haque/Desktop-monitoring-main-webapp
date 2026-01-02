"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming you have a custom checkbox
// import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";

import { 
  Send, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Loader2,
  UserCheck,
  Building2
} from "lucide-react";

// Assuming users data comes dynamically from the `users` prop.
const statusOptions = [
  { value: 'present', label: 'Present', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  { value: 'absent', label: 'Absent', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  { value: 'late', label: 'Late', icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { value: 'half_day', label: 'Half Day', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { value: 'leave', label: 'Leave', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

const ManualAttendancePage = ({ curruser, users }) => {
  console.log("Current user in ManualAttendancePage:", curruser);
  console.log("Users in ManualAttendancePage:", users);

  const { addToast } = useToast();
  
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  // Dynamic attendance data based on provided users
  const [attendanceData, setAttendanceData] = useState(
    users.reduce((acc, u) => ({
      ...acc,
      [u.user_id]: {
        user_id: u.user_id,
        selected: false,
        status: 'present',
        check_in_time: '09:00',
        check_out_time: '18:00',
        notes: '',
      }
    }), {})
  );

  const updateAttendance = (userId, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    setAttendanceData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[Number(key)].selected = checked;
      });
      return updated;
    });
  };

  const selectedCount = Object.values(attendanceData).filter(a => a.selected).length;

  const applyToAll = (field, value) => {
    setAttendanceData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[Number(key)].selected) {
          updated[Number(key)][field] = value;
        }
      });
      return updated;
    });
  };

  const handleSubmit = async () => {
    const selectedEntries = Object.values(attendanceData).filter(a => a.selected);

    if (selectedEntries.length === 0) {
      addToast({
        title: "No Users Selected",
        description: "Please select at least one user to submit attendance",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = selectedEntries.map(entry => ({
        tenant_id: curruser.tenant_id, // Pass tenant_id as per your request
        user_id: entry.user_id,
        attendance_day: `${attendanceDate}T00:00:00`,
        status: entry.status,
        check_in_time: entry.check_in_time || null,
        check_out_time: entry.check_out_time || null,
        notes: entry.notes || null,
        last_updated_by: curruser?.id ? parseInt(curruser.id) : 1,
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit attendance');
      }

      addToast({
        title: "Success!",
        description: `Attendance submitted for ${selectedEntries.length} user(s)`,
      });
      
      // toast.success(
      //   `Attendance has been added successfully`
      // );

      // Reset selections
      setSelectAll(false);
      setAttendanceData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          updated[Number(key)].selected = false;
        });
        return updated;
      });
    } catch (error) {
      console.error('Submission error:', error);
      addToast({
        title: "Submission Failed",
        description: "Could not submit attendance records. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const option = statusOptions.find(o => o.value === status);
    if (!option) return null;
    const Icon = option.icon;
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${option.bg} ${option.color}`}>
        <Icon className="w-3 h-3" />
        {option.label}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manual Attendance</h1>
          <p className="text-gray-600 mt-1">Mark attendance for multiple users at once</p>
        </div>
      </div>

      {/* Global Settings Card */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Attendance Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tenant Name</Label>
              <Input
                type="text"
                value={curruser.tenant_name} // Display tenant name from curruser
                disabled
                className="border-[rgba(9,92,253,0.3)] focus:border-[#095cfd]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Attendance Date</Label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="border-[rgba(9,92,253,0.3)] focus:border-[#095cfd]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Apply Status to Selected</Label>
              <Select onValueChange={(v) => applyToAll('status', v)}>
                <SelectTrigger className="border-[rgba(9,92,253,0.3)]">
                  <SelectValue placeholder="Apply to all" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className={`w-4 h-4 ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Users</Label>
              <div className="h-10 px-4 rounded-lg bg-gradient-to-r from-[#095cfd]/10 to-[#0b4dd5]/10 border border-[#095cfd]/20 flex items-center">
                <Users className="w-4 h-4 text-[#095cfd] mr-2" />
                <span className="font-bold text-[#095cfd]">{selectedCount}</span>
                <span className="text-muted-foreground ml-1">/ {users.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-[#095cfd]/5 to-transparent border-b border-[rgba(9,92,253,0.1)]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Team Members</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="border-[#095cfd] checked:bg-[#095cfd]"
              />
              <Label className="text-sm cursor-pointer">Select All</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {users.map((user, index) => {
              const attendance = attendanceData[user.user_id];
              return (
                <div
                  key={user.user_id}
                  className={`p-4 transition-all duration-200 ${attendance.selected ? 'bg-[#095cfd]/5' : 'hover:bg-muted/50'}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Checkbox + User Info */}
                    <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={attendance.selected}
                        onChange={(e) => updateAttendance(user.user_id, 'selected', e.target.checked)}
                        className="border-[#095cfd] checked:bg-[#095cfd]"
                      />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#095cfd] to-[#0b4dd5] flex items-center justify-center text-white font-bold text-sm">
                        {user.username[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.role_name}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-6 md:col-span-2">
                      <Select
                        value={attendance.status}
                        onValueChange={(v) => updateAttendance(user.user_id, 'status', v)}
                        disabled={!attendance.selected}
                      >
                        <SelectTrigger className={`border-[rgba(9,92,253,0.3)] h-9 ${!attendance.selected && 'opacity-50'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <opt.icon className={`w-4 h-4 ${opt.color}`} />
                                {opt.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Check In */}
                    <div className="col-span-6 md:col-span-2">
                      <div className="relative">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={attendance.check_in_time}
                          onChange={(e) => updateAttendance(user.user_id, 'check_in_time', e.target.value)}
                          disabled={!attendance.selected}
                          className={`pl-8 h-9 border-[rgba(9,92,253,0.3)] ${!attendance.selected && 'opacity-50'}`}
                        />
                      </div>
                    </div>

                    {/* Check Out */}
                    <div className="col-span-6 md:col-span-2">
                      <div className="relative">
                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={attendance.check_out_time}
                          onChange={(e) => updateAttendance(user.user_id, 'check_out_time', e.target.value)}
                          disabled={!attendance.selected}
                          className={`pl-8 h-9 border-[rgba(9,92,253,0.3)] ${!attendance.selected && 'opacity-50'}`}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="col-span-6 md:col-span-3">
                      <Input
                        placeholder="Add notes..."
                        value={attendance.notes}
                        onChange={(e) => updateAttendance(user.user_id, 'notes', e.target.value)}
                        disabled={!attendance.selected}
                        className={`h-9 border-[rgba(9,92,253,0.3)] ${!attendance.selected && 'opacity-50'}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedCount === 0}
          size="lg"
          className="bg-gradient-to-r from-[#095cfd] to-[#0b4dd5] hover:from-[#0b4dd5] hover:to-[#063aa8] text-white shadow-xl shadow-[#095cfd]/30 px-8 py-6 text-lg font-semibold disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Submit Attendance ({selectedCount})
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ManualAttendancePage;
