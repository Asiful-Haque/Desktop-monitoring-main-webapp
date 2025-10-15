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
    let { currentUser, transaction_number, logs } = body || {};

    console.log("in apiiiiiiiiiiii currentUser, transaction_number, logs:", currentUser, transaction_number, logs);

    // Check if currentUser has an id
    if (!currentUser?.id) {
      return corsJson({ error: "currentUser.id is required" }, 400);
    }

    // If logs is not an array, make it an array
    if (!Array.isArray(logs)) {
      logs = [logs]; // Convert to an array if it's not already an array
    }

    // Ensure logs array is not empty
    if (logs.length === 0) {
      return corsJson({ error: "logs array is required" }, 400);
    }

    // Ensure transaction_number is provided either globally or per log item
    if (!transaction_number && !logs.some(l => l?.transaction_number)) {
      return corsJson(
        { error: "transaction_number is required (global or per item)" },
        400
      );
    }

    console.log("logs to insert----------------------------------->>>>>>>>>>>:", logs);

    // Call the service method to insert payment logs
    const { insertedCount, rows } = await paymentLogService.createPaymentLogs({
      globalTransactionNumber: transaction_number,
      logs,
    });

    // Return success response
    return corsJson(
      {
        message: "Payment logs inserted",
        inserted_count: insertedCount,
        rows, 
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
