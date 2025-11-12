import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/app/lib/auth-server";
import { UsersService } from "@/app/services/users/usersService";

const usersService = new UsersService();

/**
 * GET /api/users/payment-type?user_id=123
 * Returns: { user_id, payment_type }
 */
export async function GET(req) {
  try {
    const auth = await getAuthFromCookie(req);
    if (!auth) {
      console.log("Unauthorized: No token found");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get("user_id");
    const userId = Number(userIdStr);

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json(
        { message: "Valid user_id is required (positive number)" },
        { status: 400 }
      );
    }

    const row = await usersService.getPaymentTypeByUserId(auth.tenant_id, userId);
    if (!row) {
      return NextResponse.json(
        { message: "User not found for this tenant" },
        { status: 404 }
      );
    }

    return NextResponse.json(row, { status: 200 });
  } catch (error) {
    console.error("Error fetching payment type:", error);
    return NextResponse.json(
      { message: "Failed to fetch payment type" },
      { status: 500 }
    );
  }
}

