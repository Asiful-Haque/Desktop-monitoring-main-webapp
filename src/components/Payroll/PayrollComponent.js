"use client";
import { useState, useMemo } from "react";
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
import FixedPayment from "../FixedPayment";

export default function PayrollComponent({
  initialDailyData = [], // Data passed from parent
  pageSize = 10,
  currentUser, // Added currentUser prop here
}) {
  console.log("Sample data:", initialDailyData.slice(0, 3));
  console.log("Current User:", currentUser);
  const [rows, setRows] = useState(
    Array.isArray(initialDailyData) ? initialDailyData : []
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("hourly"); // State for active tab
  const [processed, setProcessed] = useState({}); // Track processed rows

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

  const getStatusColor = (r) => {
    return processed[r.date]
      ? "bg-green-500/10 text-green-500 border-green-500/20"
      : "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  const getLastTransaction = async () => {
    try {
      const response = await fetch("/api/get-last-transaction");
      if (response.ok) {
        const data = await response.json();
        return data.lastTransactionNumber;
      } else {
        toast.error("Failed to fetch the last transaction number.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching the last transaction number:", error);
      toast.error("Error fetching the last transaction number.");
      return null;
    }
  };

  const handleProcess = async (date, payment, hours, label) => {
    setProcessed((prev) => ({ ...prev, [date]: true }));

    const lastTransactionNumber = await getLastTransaction();
    console.log("Last Transaction Number:", lastTransactionNumber);

    if (!lastTransactionNumber) {
      toast.error("Failed to fetch the last transaction number.");
      setProcessed((prev) => ({ ...prev, [date]: false }));
      return;
    }

    // Extract the numeric part from the last transaction number (e.g., 5 from "Trx_tnt1_5")
    const lastTransactionValue =
      parseInt(lastTransactionNumber.split("_")[2], 10) || 0;

    // Create the new transaction number (increment by 1)
    const tenantId = currentUser?.tenant_id; // Assuming tenant_id is available from currentUser
    const newTransactionNumber = `Trx_tnt${tenantId}_${
      lastTransactionValue + 1
    }`;
    console.log("New Transaction Number:", newTransactionNumber);

    // Collect data for creating the transaction
    const transactionData = {
      transaction_number: newTransactionNumber,
      hours,
      payment_of_transaction: payment,
      developer_id: currentUser?.id, // Developer ID from currentUser
      status: "pending", // Default status to 'pending'
    };

    // Step 1: Create a new transaction by calling the API
    try {
      const transactionResponse = await fetch("/api/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionData), // Send the transaction data to the backend
      });

      if (transactionResponse.ok) {
        const data = await transactionResponse.json();
        toast.success(
          `Transaction created: ${data.transaction.transaction_number}`
        );
      } else {
        toast.error("Failed to create transaction");
        setProcessed((prev) => ({ ...prev, [date]: false }));
        return;
      }
    } catch (error) {
      console.error("Error creating the transaction:", error);
      toast.error("Error creating the transaction");
      setProcessed((prev) => ({ ...prev, [date]: false }));
      return;
    }

    // try {
    //   const response = await fetch("/api/update-flagger", {
    //     method: "PUT",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       dates: [date],
    //       flagger: 1,
    //       userId: currentUser?.id || null,
    //     }),
    //   });

    //   if (response.ok) {
    //     toast.success("Marked as processed", {
    //       description: `Date ${date} • $${Number(
    //         payment || 0
    //       ).toLocaleString()} processed.`,
    //     });

    //     setRows((prevRows) => prevRows.filter((r) => r.date !== date));
    //   } else {
    //     toast.error("Failed to process the date");
    //     setProcessed((prev) => ({ ...prev, [date]: false }));
    //   }
    // } catch (error) {
    //   console.error("Error processing the date:", error);
    //   toast.error("Error processing the date");
    //   setProcessed((prev) => ({ ...prev, [date]: false }));
    // }
  };

  const handleProcessAllVisible = async () => {
    const toProcess = currentRows.filter((r) => !processed[r.date]);
    if (toProcess.length === 0) return;
    const sum = toProcess.reduce((acc, r) => acc + (r.payment || 0), 0);

    // Collecting the dates to submit
    const datesToProcess = toProcess.map((r) => r.date);

    try {
      // API Call for submitting all visible dates (Using PUT)
      const response = await fetch("/api/update-flagger", {
        method: "PUT", // Change to PUT method for updating
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: datesToProcess, // Send all dates in an array
          flagger: 1,
          userId: currentUser?.id || null,
        }),
      });

      if (response.ok) {
        const updates = {};
        toProcess.forEach((r) => (updates[r.date] = true));
        setProcessed((prev) => ({ ...prev, ...updates }));
        toast.success("Processed visible days", {
          description: `${toProcess.length} day(s) • $${sum.toLocaleString()}`,
        });
        // Optionally remove processed rows from the list
        setRows((prevRows) =>
          prevRows.filter((r) => !toProcess.some((t) => t.date === r.date))
        );
      } else {
        toast.error("Failed to process all visible dates");
      }
    } catch (error) {
      console.error("Error processing all visible dates:", error);
      toast.error("Error processing all visible dates");
    }
  };

  // all visible rows processed?
  const allVisibleProcessed =
    currentRows.length > 0 && currentRows.every((r) => processed[r.date]);

  // Display a message if no payable rows
  const isEmpty = payableRows.length === 0;

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />

      {/* Tab Navigation */}
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

          {currentUser?.role !== "Developer" && (
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

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "hourly" && (
          <div className="space-y-3">
            {/* Hourly Tab Content */}
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

              {currentRows.length !== 0 && (
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
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Payable Days</CardDescription>
                  <CardTitle className="text-3xl">
                    {payableRows.length}
                  </CardTitle>
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

            {/* Displaying hourly content */}
            {isEmpty ? (
              <div className="text-center text-muted-foreground">
                <h2 className="text-lg font-semibold">
                  Nothing to submit for payment.
                </h2>
                <p className="mt-2">No payable days available.</p>
              </div>
            ) : (
              currentRows.map((r) => {
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
                                <Clock className="h-3 w-3" /> {r.label} (
                                {r.hours} h)
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

                        {/* Per-row button */}
                        <Button
                          onClick={() =>
                            handleProcess(
                              r.date,
                              r.payment,
                              r.hours,
                              r.label || 0
                            )
                          }
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
              })
            )}
          </div>
        )}
        {activeTab === "fixed" && currentUser?.role !== "Developer" && (
          <div>
            <FixedPayment />
          </div>
        )}
        {activeTab === "history" && (
          <div>
            {/* Payment History Content */}
            <h2 className="text-2xl font-semibold">Payment History Content</h2>
          </div>
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
