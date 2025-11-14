// src/app/api/create-transaction/route.js
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { corsEmpty, corsJson } from "@/app/lib/coreResponse";
import { TransactionService } from "@/app/services/transaction/transactionService";

const transactionService = new TransactionService();

export async function POST(req) {
  console.log("H1");
  try {
    let token;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      token = authHeader.split(" ")[1]; 
    }
    if (!token) {
      token = await getAuthFromCookie(req);
    }
    if (!token) {
      return corsJson({ error: "Token missing or invalid" }, 401);
    }


    console.log("++token", token);


    const { transaction_number, hours, payment_of_transaction, developer_id, status } = await req.json();

    if (!developer_id) {
      return corsJson({ error: "Invalid developer ID" }, 400);
    }

    const transaction = await transactionService.createTransaction({
      transaction_number,
      hours,
      payment_of_transaction,
      developer_id,
      status: status || "pending",  
    });

    return corsJson(
      { message: "Transaction created successfully", transaction },
      201
    );
  } catch (error) {
    console.error("❌ Error creating transaction:", error);
    return corsJson({ error: "Failed to create transaction" }, 500);
  }
}

export async function OPTIONS() {
  return corsEmpty();
}
