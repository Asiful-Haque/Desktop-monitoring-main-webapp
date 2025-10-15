// src/app/api/payment-issuing-data-for-admin/route.js
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { corsJson, corsEmpty } from "@/app/lib/coreResponse";
import { TransactionService } from "@/app/services/transaction/transactionService";

const transactionService = new TransactionService();

export async function POST(req) {
  try {
    // Check authentication token
    const token = await getAuthFromCookie(req);
    if (!token) return corsJson({ error: "Token missing or invalid" }, 401);

    // Fetch pending transactions
    const pendingTransactions = await transactionService.getPendingDatoForAdminToPayorReject();

    return corsJson(
      { message: "Pending transactions fetched successfully", data: pendingTransactions },
      200
    );
  } catch (error) {
    console.error("❌ Error fetching pending transactions:", error);
    const msg = error?.message || "Failed to fetch pending transactions";
    return corsJson({ error: msg }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
