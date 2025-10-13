"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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

const getStatusColor = (status) => {
  switch (String(status).toLowerCase()) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "processed":
    case "paid":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }
};

// Solid, button-like pill styles (like a Submit button)
const getStatusButtonStyle = (status) => {
  switch (String(status).toLowerCase()) {
    case "pending":
      return "bg-yellow-500 text-white hover:bg-yellow-600";
    case "processed":
    case "paid":
      return "bg-green-600 text-white hover:bg-green-700";
    case "rejected":
      return "bg-red-600 text-white hover:bg-red-700";
    default:
      return "bg-indigo-600 text-white hover:bg-indigo-700";
  }
};

const initialsFromName = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return "";
};

function PaymentHistory({
  currentUser,
  endpoint = "/api/get-transaction-for-history",
}) {
  const pathname = usePathname() || "";

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(1);
  const itemsPerPage = 10;

  const avatarClass =
    "w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium";

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ currentUser }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Request failed: ${res.status}`);
        }
        const json = await res.json();
        if (cancel) return;
        setRows(Array.isArray(json?.data) ? json.data : []);
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

  const isAdmin = currentUser?.role === "Admin";
  const filteredRows = React.useMemo(
    () =>
      isAdmin
        ? rows.filter((r) => String(r.status || "").toLowerCase() !== "pending")
        : rows,
    [rows, isAdmin]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const visible = filteredRows.slice(start, end);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
  if (filteredRows.length === 0) {
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
            key={item.id}
            className="hover:shadow-md transition-shadow border-l-4 border-blue-500"
          >
            <CardContent>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={avatarClass}>
                          {initialsFromName(item.developer_name)}
                        </div>
                        <h3 className="font-semibold text-lg">
                          {item.developer_name}
                        </h3>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : ""}
                      </div>
                    </div>

                    <div className=" w-full lg:w-auto   lg:items-end items-start">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          $
                          {Number(
                            item.payment_of_transaction ?? 0
                          ).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={`border-0 shadow px-4 py-2 rounded-md font-medium ${getStatusButtonStyle(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
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
                  page === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => {
              const p = i + 1;
              if (
                p === 1 ||
                p === totalPages ||
                (p >= page - 1 && p <= page + 1)
              ) {
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

export default PaymentHistory;
