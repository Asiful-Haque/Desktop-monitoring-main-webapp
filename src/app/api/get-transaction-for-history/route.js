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

    const { currentUser } = await req.json();
    if (!currentUser || !currentUser.role) {
      return corsJson({ error: "currentUser with role is required in body" }, 400);
    }

    const isScoped = ["Developer", "Team Lead"].includes(currentUser.role);
    const developerId = isScoped ? currentUser.id : undefined;

    const data = await transactionService.findPendingTransactions({ developerId });

    return corsJson({ data }, 200);
  } catch (error) {
    console.error("❌ Error fetching pending transactions:", error);
    return corsJson({ error: "Failed to fetch pending transactions" }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
