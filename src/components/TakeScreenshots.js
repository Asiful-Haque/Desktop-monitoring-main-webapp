"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Image as ImageIcon } from "lucide-react";

function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function getStatusColor(status) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-green-100 text-green-800 border-green-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

export default function TaskScreenshots({ screenshots }) {
  const router = useRouter();

  const meta = useMemo(() => {
    const first = screenshots[0];
    return first
      ? {
          task_id: first.task_id,
          task_name: first.task_name,
          assigned_to: first.assigned_to,
          task_status: first.task_status,
        }
      : null;
  }, [screenshots]);

  if (!screenshots.length) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Tasks
          </Button>
        </div>
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No screenshots found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-2rem)]"> {/* Full height minus page padding */}
      {/* Back button */}
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <Button
          variant="ghost"
          onClick={() => router.push("/tasks")}
          className="flex items-center gap-2 hover:bg-accent/30"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tasks
        </Button>
      </div>

      {/* Task Info */}
      <div className="mb-8 shrink-0">
        <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/10 to-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl text-foreground">Task #{meta.task_id}</CardTitle>
                <p className="text-lg text-muted-foreground mt-1">{meta.task_name}</p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    meta.task_status
                  )}`}
                >
                  {meta.task_status}
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Scrollable screenshot list */}
      <div className="space-y-6 overflow-y-auto pr-2 flex-1">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 sticky top-0 bg-white py-2 z-10">
          <ImageIcon className="h-5 w-5" /> Screenshots
        </h2>

        <div className="grid gap-4">
          {screenshots.map((row, idx) => (
            <Card
              key={row.screenshot_id}
              className={`overflow-hidden shadow-md transition-all duration-300 group hover:shadow-xl ${
                idx % 2 === 0
                  ? "bg-gradient-to-r from-gray-50 to-white"
                  : "bg-gradient-to-r from-gray-100 to-white"
              }`}
            >
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="flex-1 p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-primary-foreground rounded-full flex items-center justify-center font-semibold shadow">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">
                          {row.screenshot_path.split("/").pop()}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Active: {row.active_seconds}s
                          </span>
                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            Idle: {row.idle_seconds}s
                          </span>
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                            Created: {formatDateTime(row.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <Button
                      onClick={() => window.open(row.screenshot_path, "_blank")}
                      className="bg-blue-600 text-primary-foreground hover:bg-primary/90 group-hover:scale-105 transition-transform shadow"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Open Image
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 shrink-0">
        <Card className="border-0 shadow-lg bg-accent/20">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Total {screenshots.length} screenshot{screenshots.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
