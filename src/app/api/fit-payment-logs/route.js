// src/app/api/payment-logs/route.js
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { corsEmpty, corsJson } from "@/app/lib/coreResponse";
import { PaymentLogService } from "@/app/services/paymentLogService/paymentLogService";


const paymentLogService = new PaymentLogService();

export async function POST(req) {
  try {
    const token = await getAuthFromCookie(req);
    if (!token) {
      return corsJson({ error: "Token missing or invalid" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { currentUser, transaction_number, logs } = body || {};

    if (!currentUser?.id) {
      return corsJson({ error: "currentUser.id is required" }, 400);
    }
    if (!Array.isArray(logs) || logs.length === 0) {
      return corsJson({ error: "logs array is required" }, 400);
    }
    if (!transaction_number && !logs.some(l => l?.transaction_number)) {
      return corsJson(
        { error: "transaction_number is required (global or per item)" },
        400
      );
    }

    const { insertedCount, rows } = await paymentLogService.createPaymentLogs({
      globalTransactionNumber: transaction_number,
      logs,
    });

    return corsJson(
      {
        message: "Payment logs inserted",
        inserted_count: insertedCount,
        rows, // rows we attempted to insert (no session_id since DB generates it)
      },
      201
    );
  } catch (err) {
    console.error("❌ Error inserting payment logs:", err);
    return corsJson({ error: "Failed to insert payment logs" }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
