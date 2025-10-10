import { getAuthFromCookie } from "@/app/lib/auth-server";
import { corsEmpty, corsJson } from "@/app/lib/coreResponse";
import { TransactionService } from "@/app/services/transaction/transactionService";


const transactionService = new TransactionService();

export async function GET(req) {
  try {
    const token = await getAuthFromCookie(req); 
    if (!token) {
      return corsJson({ error: "Token missing or invalid" }, 401);
    }
    const lastTransaction = await transactionService.getLastTransactionNumber();
    console.log("🔍 Last transaction number retrieved:", lastTransaction);
    if (!lastTransaction) {
      return corsJson({ error: "No transactions found" }, 404);
    }

    return corsJson(
      { lastTransactionNumber: lastTransaction },
      200
    );
  } catch (error) {
    console.error("❌ Error retrieving last transaction number:", error);
    return corsJson({ error: "Failed to retrieve last transaction number" }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
