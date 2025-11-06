"use client";
import { useState, useMemo } from "react";
import { Toaster } from "sonner";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginationComponent from "../commonComponent/PaginationComponent";
import { DollarSign, CheckCircle, Clock, Calendar } from "lucide-react";
import FixedPayment from "../FixedPayment";
import PaymentHistory from "./PaymentHistory";
import AdminPayrollComponent from "./AdminPayrollComponent";
// ✅ import shared actions & (optionally) fmtMoney if you still use it locally
import { fmtMoney, submitAllVisiblePayments, submitSinglePayment } from "@/app/lib/PaymentCommonApi";


const getStatusColor = (isDone) =>
  isDone
    ? "bg-green-500/10 text-green-500 border-green-500/20"
    : "bg-blue-500/10 text-blue-500 border-blue-500/20";

function TabsNav({ activeTab, setActiveTab, canShowFixed }) {
  return (
    <div className="rounded-2xl bg-white/60 backdrop-blur border border-white/50 p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-xl hover:bg-white/60 focus:outline-none ${
            activeTab === "hourly"
              ? "text-indigo-700 shadow-sm ring-2 ring-indigo-300"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("hourly")}
        >
          Hourly Pay
        </button>

        {canShowFixed && (
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-xl hover:bg-white/60 focus:outline-none ${
              activeTab === "fixed"
                ? "text-indigo-700 shadow-sm ring-2 ring-indigo-300"
                : "text-gray-600"
            }`}
            onClick={() => setActiveTab("fixed")}
          >
            Fixed Pay
          </button>
        )}

        <button
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-xl hover:bg-white/60 focus:outline-none ${
            activeTab === "history"
              ? "text-indigo-700 shadow-sm ring-2 ring-indigo-300"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("history")}
        >
          Payment History
        </button>
      </div>
    </div>
  );
}

function SummaryCards({ payableCount, totalHours, totalPayment }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Payable Days</CardDescription>
          <CardTitle className="text-3xl">{payableCount}</CardTitle>
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
            {fmtMoney(totalPayment)}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

function HeaderWithSubmitAll({ hasRows, allVisibleProcessed, onSubmitAll }) {
  if (!hasRows) return null;
  return (
    <Button
      onClick={onSubmitAll}
      disabled={allVisibleProcessed}
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
  );
}

function PayableRowCard({ row, isDone, onSubmit }) {
  return (
    <Card
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
                    {row.date}
                  </h3>
                  <Badge variant="outline" className={getStatusColor(isDone)}>
                    {isDone ? "processed" : "payable"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> {row.label} ({row.hours} h)
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {fmtMoney(row.payment)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Per-day total payment
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={onSubmit}
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
}

export default function PayrollComponent({
  initialDailyData = [],
  pageSize = 10,
  currentUser,
}) {
  console.log(" [PayrollComponent] initialDailyData for : ", currentUser.role, initialDailyData);

  const [rows, setRows] = useState(Array.isArray(initialDailyData) ? initialDailyData : []);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("hourly");
  const [processed, setProcessed] = useState({}); // keyed by row.id

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

  const allVisibleProcessed =
    currentRows.length > 0 && currentRows.every((r) => processed[r.id]);

  const isEmpty = payableRows.length === 0;
  const isAdmin = currentUser?.role === "Admin";

  // --- Submit handlers now delegate to the common actions ---

  const handleProcess = async (id, date /* payment, hours, label not needed here */) => {
    await submitSinglePayment({
      id,
      date,
      rows,
      setRows,
      processed,
      setProcessed,
      currentUser,
    });
  };

  const handleProcessAllVisible = async () => {
    console.log("Submitting all visible payments...-------dummy log");
    console.log("currentRows:", currentRows);
    console.log("processed:", processed);
    console.log("setProcessed:", setProcessed);
    console.log("setRows:", setRows);
    console.log("currentUser:", currentUser);

    // await submitAllVisiblePayments({
    //   currentRows,
    //   processed,
    //   setProcessed,
    //   setRows,
    //   currentUser,
    // });
  };

  console.log("**********************", currentRows);
  console.log("**********************", processed);

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />

      {/* Tabs */}
      <TabsNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        canShowFixed={currentUser?.role === "Admin"}
      />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "hourly" &&
          (currentUser?.role === "LOLLLLLLLLLLLLLLLLLLLLLLLLLLLL" ? (
            <div className="space-y-3">
              <Card className="border-amber-300">
                <CardHeader>
                  <CardTitle className="text-xl">Access Restricted</CardTitle>
                  <CardDescription>
                    You are not allowed to see the payroll. Please check the
                    <span className="font-medium text-amber-700"> History </span>
                    tab for your payment tracking.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Button variant="outline" onClick={() => setActiveTab("history")}>
                    Go to History
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : isAdmin ? (
            <div>
              <AdminPayrollComponent currentUser={currentUser} />
            </div>
          ) : (
            <div className="space-y-3">
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

                <HeaderWithSubmitAll
                  hasRows={currentRows.length !== 0}
                  allVisibleProcessed={allVisibleProcessed}
                  onSubmitAll={handleProcessAllVisible}
                />
              </div>

              <SummaryCards
                payableCount={payableRows.length}
                totalHours={totalHours}
                totalPayment={totalPayment}
              />

              {isEmpty ? (
                <div className="text-center text-muted-foreground">
                  <h2 className="text-lg font-semibold">
                    Nothing to submit for payment.
                  </h2>
                  <p className="mt-2">No payable days available.</p>
                </div>
              ) : (
                currentRows.map((r) => (
                  <PayableRowCard
                    key={r.id}
                    row={r}
                    isDone={!!processed[r.id]}
                    onSubmit={() => handleProcess(r.id, r.date)}
                  />
                ))
              )}
            </div>
          ))}

        {activeTab === "fixed" && currentUser?.role !== "Developer" && (
          <div>
            <FixedPayment />
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <PaymentHistory currentUser={currentUser} />
          </div>
        )}
      </div>

      {/* Pagination */}
      <PaginationComponent
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}
