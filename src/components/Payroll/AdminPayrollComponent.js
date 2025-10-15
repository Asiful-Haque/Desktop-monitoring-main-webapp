"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { CreditCard, XCircle } from "lucide-react";

const getStatusColor = (status) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "processed":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }
};

const initialsFromTrx = (trx = "") => {
  if (!trx) return "";
  const clean = String(trx).replace(/[^A-Za-z]/g, "");
  if (clean.length >= 2) return (clean[0] + clean[1]).toUpperCase();
  if (clean.length === 1) return clean[0].toUpperCase();
  return "";
};

function AdminPayrollComponent({ currentUser }) {
  const isAdmin = currentUser?.role === "Admin";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState({}); // { [transaction_number]: boolean }
  const itemsPerPage = 10;

  const avatarClass =
    "w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium";

  // Memoized fetcher (optional AbortSignal)
  const reload = useCallback(
    async (signal) => {
      const res = await fetch("/api/payment-issuing-data-for-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentUser }),
        signal,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Request failed: ${res.status}`);
      }
      const json = await res.json();
      return Array.isArray(json?.data) ? json.data : [];
    },
    [currentUser]
  );

  // Load history
  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await reload(ac.signal);
        if (cancelled) return;
        setRows(data);
      } catch (e) {
        if (!cancelled && e?.name !== "AbortError")
          setError(e?.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [reload]);

  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const visible = rows.slice(start, end);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Handle the Pay button click - update status to "processed"
  const handlePay = async (transaction_number) => {
    if (!transaction_number) return;
    if (busy[transaction_number]) return;

    setBusy((b) => ({ ...b, [transaction_number]: true }));
    const prevRows = rows;

    // Optimistic remove
    const nextRows = prevRows.filter(
      (r) => r.transaction_number !== transaction_number
    );
    setRows(nextRows);

    // Keep pagination sane if page empties
    const newTotalPages = Math.max(1, Math.ceil(nextRows.length / itemsPerPage));
    if (page > newTotalPages) setPage(newTotalPages);

    try {
      const res = await fetch("/api/pay-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transaction_number }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Payment failed: ${res.status}`);
      }

      // Hard refresh to show newest data
      const fresh = await reload();
      setRows(fresh);
      const freshTotal = Math.max(1, Math.ceil(fresh.length / itemsPerPage));
      if (page > freshTotal) setPage(freshTotal);
    } catch (e) {
      setRows(prevRows); // rollback
      setError(e?.message || "Failed to mark payment as processed");
    } finally {
      setBusy((b) => {
        const copy = { ...b };
        delete copy[transaction_number];
        return copy;
      });
    }
  };

  // Handle the Reject button click - update status to "rejected"
  const handleReject = async (transaction_number) => {
    if (!transaction_number) return;
    if (busy[transaction_number]) return;

    setBusy((b) => ({ ...b, [transaction_number]: true }));
    const prevRows = rows;

    // Optimistic remove
    const nextRows = prevRows.filter(
      (r) => r.transaction_number !== transaction_number
    );
    setRows(nextRows);

    // Keep pagination sane if page empties
    const newTotalPages = Math.max(1, Math.ceil(nextRows.length / itemsPerPage));
    if (page > newTotalPages) setPage(newTotalPages);

    try {
      const res = await fetch("/api/reject-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transaction_number }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Reject failed: ${res.status}`);
      }

      // Hard refresh to show newest data
      const fresh = await reload();
      setRows(fresh);
      const freshTotal = Math.max(1, Math.ceil(fresh.length / itemsPerPage));
      if (page > freshTotal) setPage(freshTotal);
    } catch (e) {
      setRows(prevRows); // rollback
      setError(e?.message || "Failed to reject transaction");
    } finally {
      setBusy((b) => {
        const copy = { ...b };
        delete copy[transaction_number];
        return copy;
      });
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-red-500">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          No data.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {visible.map((item) => (
          <Card
            key={`${item.transaction_number}-${item.id ?? ""}`}
            className="hover:shadow-md transition-shadow border-l-4 border-blue-500"
          >
            <CardContent>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={avatarClass}>
                          {initialsFromTrx(item.developer_rel.username)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">
                            {item.developer_rel?.username }
                          </h3>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        $
                        {Number(
                          item.payment_of_transaction ?? 0
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Hours: {Number(item.hour ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {isAdmin ? (
                  <div>
                    <div className="flex gap-2 w-full lg:w-auto">
                      <Button
                        onClick={() => handlePay(item.transaction_number)}
                        variant="default"
                        className="flex-1 lg:flex-initial bg-indigo-600 text-white hover:bg-indigo-700"
                        disabled={!!busy[item.transaction_number]}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay
                      </Button>
                      <Button
                        onClick={() => handleReject(item.transaction_number)}
                        variant="destructive"
                        className="flex-1 lg:flex-initial"
                        disabled={
                          !!busy[item.transaction_number] ||
                          item.status === "rejected"
                        }
                        title={
                          item.status === "rejected"
                            ? "Already rejected"
                            : undefined
                        }
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {busy[item.transaction_number] ? "Rejecting…" : "Reject"}
                      </Button>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Transaction: {item.transaction_number}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full lg:w-auto">
                    <Badge
                      variant="outline"
                      className={`inline-flex items-center justify-center px-3 py-2 text-sm border ${getStatusColor(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={
                  page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>

            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      onClick={() => setPage(p)}
                      isActive={page === p}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (p === page - 2 || p === page + 2) {
                return <PaginationEllipsis key={p} />;
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={
                  page === totalPages
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

export default AdminPayrollComponent;
