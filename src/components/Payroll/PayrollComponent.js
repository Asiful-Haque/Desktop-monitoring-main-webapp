// components/Payroll/PayrollComponent.jsx
"use client";

import React, { useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DollarSign, CheckCircle, Clock, Calendar } from "lucide-react";

export default function PayrollComponent({
  initialDailyData = [],
  pageSize = 10,
}) {
  const [rows] = useState(
    Array.isArray(initialDailyData) ? initialDailyData : []
  );
  const [currentPage, setCurrentPage] = useState(1);

  // payable only
  const payableRows = useMemo(
    () => rows.filter((r) => Number(r?.payment) > 0),
    [rows]
  );

  const itemsPerPage = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(payableRows.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRows = payableRows.slice(startIndex, endIndex);

  const { totalHours, totalPayment } = useMemo(() => {
    const h = payableRows.reduce(
      (acc, r) => acc + (Number.isFinite(r.hours) ? r.hours : 0),
      0
    );
    const p = payableRows.reduce((acc, r) => acc + (Number(r.payment) || 0), 0);
    return { totalHours: Math.round(h * 100) / 100, totalPayment: p };
  }, [payableRows]);

  // processed state
  const [processed, setProcessed] = useState({});

  const getStatusColor = (r) => {
    return processed[r.date]
      ? "bg-green-500/10 text-green-500 border-green-500/20"
      : "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  const handleProcess = (date, payment) => {
    setProcessed((prev) => ({ ...prev, [date]: true }));
    toast.success("Marked as processed", {
      description: `Date ${date} • $${Number(
        payment || 0
      ).toLocaleString()} processed.`,
    });
  };

  const handleProcessAllVisible = () => {
    const toProcess = currentRows.filter((r) => !processed[r.date]);
    if (toProcess.length === 0) return;
    const sum = toProcess.reduce((acc, r) => acc + (r.payment || 0), 0);
    const updates = {};
    toProcess.forEach((r) => (updates[r.date] = true));
    setProcessed((prev) => ({ ...prev, ...updates }));
    toast.success("Processed visible days", {
      description: `${toProcess.length} day(s) • $${sum.toLocaleString()}`,
    });
  };

  // all visible rows processed?
  const allVisibleProcessed =
    currentRows.length > 0 && currentRows.every((r) => processed[r.date]);

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            Payroll (Daily Summary)
          </h1>
          <p className="text-muted-foreground mt-1">
            Payable days only (payment &gt; 0)
          </p>
        </div>

        {/* Submit All -> turns green when all visible are processed */}
        <Button
          onClick={handleProcessAllVisible}
          disabled={allVisibleProcessed || currentRows.length === 0}
          className={`w-full sm:w-auto px-3 py-2 rounded-md text-sm font-medium transition
    shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70
    ${
      allVisibleProcessed
        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
        : "bg-indigo-600 text-white hover:bg-indigo-700"
    }
    disabled:opacity-100 disabled:bg-emerald-600 disabled:text-white disabled:cursor-not-allowed`}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {allVisibleProcessed ? "All Submitted" : "Submit All"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payable Days</CardDescription>
            <CardTitle className="text-3xl">{payableRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Hours (payable)</CardDescription>
            <CardTitle className="text-3xl">{totalHours}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payment</CardDescription>
            <CardTitle className="text-3xl text-primary">
              ${totalPayment.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Daily rows (payable only) */}
      <div className="space-y-3">
        {currentRows.map((r) => {
          const isDone = !!processed[r.date];
          return (
            <Card
              key={r.date}
              className={`hover:shadow-md transition-shadow border-l-4 ${
                isDone ? "border-green-500" : "border-blue-500"
              }`}
            >
              <CardContent className="px-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {r.date}
                          </h3>
                          <Badge
                            variant="outline"
                            className={getStatusColor(r)}
                          >
                            {isDone ? "processed" : "payable"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                          <Clock className="h-3 w-3" /> {r.label} ({r.hours} h)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          ${Number(r.payment || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Per-day total payment
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Per-row button -> turns green when processed */}
                  <Button
                    onClick={() => handleProcess(r.date, r.payment || 0)}
                    disabled={isDone}
                    className={`w-full lg:w-auto px-3 py-2 rounded-md text-sm font-medium transition
    shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70
    ${
      isDone
        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
        : "bg-indigo-600 text-white hover:bg-indigo-700"
    }
    disabled:opacity-100 disabled:bg-emerald-600 disabled:text-white disabled:cursor-not-allowed`}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isDone ? "Submitted" : "Submit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {payableRows.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No payable days found.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && payableRows.length > 0 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <PaginationEllipsis key={page} />;
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
