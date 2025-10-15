// src/app/api/reject-payment/route.js
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { corsEmpty, corsJson } from "@/app/lib/coreResponse";
import { TransactionService } from "@/app/services/transaction/transactionService";

const transactionService = new TransactionService();

export async function POST(req) {
  try {
    const token = await getAuthFromCookie(req);
    if (!token) {
      return corsJson({ error: "Token missing or invalid" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const transaction_id = body?.transaction_number;

    if (!transaction_id) {
      return corsJson({ error: "Missing required 'id' (or 'transaction_id')" }, 400);
    }

    const updated = await transactionService.rejectTransaction(transaction_id);
    return corsJson({ message: "Transaction rejected successfully", transaction: updated }, 200);
  } catch (error) {
    console.error("❌ Error rejecting transaction:", error);
    const msg = error?.message || "Failed to reject transaction";
    const status = msg === "Transaction not found" ? 404 : 500;
    return corsJson({ error: msg }, status);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
