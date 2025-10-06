// components/ProjectStatsRow.jsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Wallet, Timer, BadgeDollarSign, Receipt } from "lucide-react";
import EditProjectModal from "@/components/EditProjectModal";

export default function ProjectStatsRow({ project = {}, curruser }) {
  const [editOpen, setEditOpen] = useState(false);
  //   console.log("ProjectStatsRow project8888888888:", project);
  console.log("Budget:", project.budget, "SpentAmount:", project.spentAmount);

  const fmtMoney = (n) =>
    n === null || n === undefined || n === "" || isNaN(Number(n))
      ? null
      : Number(n).toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        });

  const fmtMinutes = (mins) => {
    const m = Math.max(0, Math.floor(Number(mins || 0)));
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const pad = (x) => String(x).padStart(2, "0");
    return `${pad(h)}h ${pad(mm)}m`;
  };

  const totalBudget = project.budget;
  const liveCost = fmtMoney(project.liveCost);
  const spentHours = fmtMinutes(project.spentMinutes);
  const billableAmount = fmtMoney(project.billableAmount);
  const invoicedAmount = fmtMoney(project.invoicedAmount);

  const canEditBudget = !curruser || curruser.role !== "Developer";

  return (
    <>
      <div className="mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 auto-rows-fr">
          {/* Total Budget */}
          <RowStatCard>
            <CardHeader className="flex items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconChip tone="amber">
                  <Coins className="h-4 w-4" />
                </IconChip>
                Total Budget
              </CardTitle>
              {canEditBudget && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  onClick={() => setEditOpen(true)}
                >
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Metric value={totalBudget || "Budget not set"} tone="amber" />
              <Subtle>Allocated</Subtle>
            </CardContent>
          </RowStatCard>

          {/* Amount Spent */}
          <RowStatCard>
            <CardHeader className="flex items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconChip tone="rose">
                  <Wallet className="h-4 w-4" />
                </IconChip>
                Live Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Metric value={liveCost} tone="rose" />
              <Subtle>Costs to date</Subtle>
            </CardContent>
          </RowStatCard>

          {/* Hours Spent */}
          <RowStatCard>
            <CardHeader className="flex items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconChip tone="blue">
                  <Timer className="h-4 w-4" />
                </IconChip>
                Hours Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Metric value={spentHours} tone="blue" />
              <Subtle>Tracked time</Subtle>
            </CardContent>
          </RowStatCard>

          {/* Billable */}
          <RowStatCard>
            <CardHeader className="flex items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconChip tone="emerald">
                  <BadgeDollarSign className="h-4 w-4" />
                </IconChip>
                Billable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Metric value={billableAmount || "$0.00"} tone="emerald" />
              <Subtle>Billable to client</Subtle>
            </CardContent>
          </RowStatCard>

          {/* Invoiced */}
          <RowStatCard>
            <CardHeader className="flex items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconChip tone="purple">
                  <Receipt className="h-4 w-4" />
                </IconChip>
                Invoiced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Metric value={invoicedAmount || "$0.00"} tone="purple" />
              <Subtle>Already invoiced</Subtle>
            </CardContent>
          </RowStatCard>
        </div>
      </div>

      <EditProjectModal
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={project && project.id}
      />
    </>
  );
}

function RowStatCard({ children }) {
  return (
    <Card className="relative h-full rounded-sm border bg-white/80 backdrop-blur-sm shadow-sm ">
      <div className="group">{children}</div>
    </Card>
  );
}

function IconChip({ children, tone = "blue" }) {
  const bg =
    {
      amber: "bg-amber-100 text-amber-700",
      rose: "bg-rose-100 text-rose-700",
      blue: "bg-blue-100 text-blue-700",
      emerald: "bg-emerald-100 text-emerald-700",
      purple: "bg-purple-100 text-purple-700",
    }[tone] || "bg-gray-100 text-gray-700";
  return (
    <span className={`h-8 w-8 rounded-full grid place-items-center ${bg}`}>
      {children}
    </span>
  );
}

function Metric({ value, tone = "blue" }) {
  const color =
    {
      amber: "text-amber-700",
      rose: "text-rose-700",
      blue: "text-blue-700",
      emerald: "text-emerald-700",
      purple: "text-purple-700",
    }[tone] || "text-slate-800";
  return (
    <div className={`text-2xl font-semibold tracking-tight ${color}`}>
      {value}
    </div>
  );
}

function Subtle({ children }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>;
}
