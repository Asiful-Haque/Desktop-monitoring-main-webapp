// src/app/api/pay-payment/route.js
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { corsJson, corsEmpty } from "@/app/lib/coreResponse";
import { TransactionService } from "@/app/services/transaction/transactionService";

const transactionService = new TransactionService();

export async function POST(req) {
  try {
    // Authenticate the request (check token)
    const token = await getAuthFromCookie(req);
    if (!token) return corsJson({ error: "Token missing or invalid" }, 401);

    // Extract the transaction_number from the request body
    const { transaction_number } = await req.json();
    if (!transaction_number) {
      return corsJson({ error: "Transaction number is required" }, 400);
    }

    // Call the service method to mark the transaction as "processed"
    const updatedTransaction = await transactionService.acceptTransaction(transaction_number);

    // Return the updated transaction data
    return corsJson(
      { message: "Transaction marked as processed successfully", transaction: updatedTransaction },
      200
    );
  } catch (error) {
    console.error("❌ Error marking transaction as processed:", error);
    const msg = error?.message || "Failed to mark transaction as processed";
    return corsJson({ error: msg }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
