"use client";
import React from "react";
import { usePathname } from "next/navigation";
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
import { Admin } from "typeorm";

/**
 * Helpers limited strictly to API fields:
 * - transaction_number -> used as title and avatar initials
 * - status -> badge
 * - payment_of_transaction -> amount
 * - hour -> hours
 * - created_at -> date
 */
const getStatusColor = (status) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "processed":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      // for "submitted" or other strings if they ever appear
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  }
};

// Derive two-letter initials from transaction_number (e.g., "Trx_tnt1_12" -> "TR")
const initialsFromTrx = (trx = "") => {
  if (!trx) return "";
  const clean = String(trx).replace(/[^A-Za-z]/g, "");
  if (clean.length >= 2) return (clean[0] + clean[1]).toUpperCase();
  if (clean.length === 1) return clean[0].toUpperCase();
  return "";
};

function AdminPayrollComponent({ currentUser, endpoint = "/api/get-transaction-for-history" }) {
  const pathname = usePathname() || "";
  const isAdmin = currentUser?.role === "Admin";

  const [rows, setRows] = React.useState([]); // holds array of API items (no extra fields)
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(1);
  const itemsPerPage = 10;

  const avatarClass =
    "w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium"

  // Fetch strictly from API, send currentUser in body
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // send auth cookie
          body: JSON.stringify({ currentUser }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Request failed: ${res.status}`);
        }
        const json = await res.json();
        if (cancel) return;
        // Expecting shape: { data: [ { id, transaction_number, hour, payment_of_transaction, status, created_at, ... } ] }
        const data = Array.isArray(json?.data) ? json.data : [];
        setRows(data);
      } catch (e) {
        if (!cancel) setError(e.message || "Failed to load data");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [endpoint, currentUser]);

  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const visible = rows.slice(start, end);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Local state updates only; no extra fields added
  const handlePay = (id) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "processed" } : r)));
  };
  const handleReject = (id) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-red-500">{error}</CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">No data.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {visible.map((item) => (
          <Card
            key={item.id}
            className="hover:shadow-md transition-shadow border-l-4 border-blue-500"
          >
            <CardContent>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={avatarClass}>{initialsFromTrx(item.developer_name)}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{item.developer_name}</h3>
                        </div>
                      </div>
                      {/* Under-title meta (using only allowed fields) */}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        $
                        {Number(item.payment_of_transaction ?? 0).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Hours: {Number(item.hour ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side: Admin actions OR big status badge */}
                {isAdmin ? (
                  <div className="flex gap-2 w-full lg:w-auto">
                    <Button
                      onClick={() => handlePay(item.id)}
                      variant="default"
                      className="flex-1 lg:flex-initial bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay
                    </Button>
                    <Button
                      onClick={() => handleReject(item.id)}
                      variant="destructive"
                      className="flex-1 lg:flex-initial"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
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
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {[...Array(totalPages)].map((_, i) => {
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
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

export default AdminPayrollComponent;
