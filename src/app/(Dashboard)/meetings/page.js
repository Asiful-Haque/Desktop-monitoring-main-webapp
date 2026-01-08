"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, CheckCircle2, XCircle, Link as LinkIcon, Video } from "lucide-react";
import Link from "next/link"; // Use next/link for routing
import { useToast } from "@/hooks/use-toast";

// Meeting Statuses
const MEETING_STATUS = {
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled"
};

// Dummy meeting data (Demo)
const meetingData = [
  { id: 1, title: "Project Kickoff", status: MEETING_STATUS.pending, time: "2026-01-30 10:00 AM", link: "https://meet.google.com/xyz" },
  { id: 2, title: "Team Sync", status: MEETING_STATUS.completed, time: "2026-01-29 11:00 AM", link: "https://meet.google.com/abc" },
  { id: 3, title: "Client Meeting", status: MEETING_STATUS.pending, time: "2026-02-02 3:00 PM", link: "https://meet.google.com/def" },
  { id: 4, title: "Board Meeting", status: MEETING_STATUS.cancelled, time: "2026-01-28 9:00 AM", link: "https://meet.google.com/ghi" }
];

const isAdminUser = (role) => {
  return role === "admin" || role === "superadmin";
};

export default function MeetingsPage({ curruser }) {
  const { addToast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [meetings, setMeetings] = useState(meetingData);
  
  useEffect(() => {
    setIsAdmin(isAdminUser(curruser?.role));
  }, [curruser]);

  const handleMeetingClick = (meetingLink) => {
    window.open(meetingLink, "_blank");
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      
      {/* Google Meet Integration Coming Soon Section */}
      <div className="text-center py-20 bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] text-white rounded-xl shadow-lg">
        <h1 className="text-5xl font-bold mb-6 animate-pulse">Google Meet Integration</h1>
        <h2 className="text-4xl font-semibold">Coming Soon</h2>
      </div>

      {/* Meetings Section */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Meetings</h1>
        <p className="text-gray-600 mt-2">
          {isAdmin ? "Admin view: All meetings" : "User view: Pending meetings"}
        </p>
      </div>

      {/* Meetings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* If Admin: Show all meetings, Else: Show pending only */}
        {meetings.filter(meeting => isAdmin || meeting.status === MEETING_STATUS.pending).map((meeting) => (
          <Card key={meeting.id} className="border-0 shadow-xl bg-white/70 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 rounded-lg transform hover:scale-105">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold">{meeting.title}</CardTitle>
              <p className="text-sm text-gray-500">{meeting.time}</p>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Status Badge */}
              <div className={`text-sm font-semibold px-4 py-2 rounded-full mb-3 ${meeting.status === MEETING_STATUS.pending ? "bg-yellow-100 text-yellow-500" : meeting.status === MEETING_STATUS.completed ? "bg-green-100 text-green-500" : "bg-red-100 text-red-500"}`}>
                {meeting.status}
              </div>
              {/* Google Meet Icon */}
              <div className="flex items-center gap-2">
                <Video className="w-6 h-6 text-green-500" />
                <p className="text-sm text-gray-600">Google Meet</p>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <Button variant="outline" onClick={() => handleMeetingClick(meeting.link)} className="gap-2">
                  <LinkIcon className="w-4 h-4" /> Join Meeting
                </Button>
                {meeting.status === MEETING_STATUS.pending && (
                  <Link href={`/edit-meeting/${meeting.id}`} className="text-blue-500 hover:text-blue-700 transition-all duration-300">
                    Edit Meeting
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin or User View Option */}
      <div className="mt-6 flex justify-end">
        {!isAdmin && (
          <Button variant="outline" onClick={() => addToast({ title: "You are viewing pending meetings", variant: "info" })}>
            View Pending Meetings
          </Button>
        )}
      </div>
    </div>
  );
}
