import { SignupService } from "@/app/services/signup/signupService";
import { NextResponse } from "next/server";
import { signToken, signRefreshToken } from "@/app/lib/auth";

function cookieAttrsFor(req) {
  const isHttps = new URL(req.url).protocol === "https:";
  return isHttps
    ? { httpOnly: true, sameSite: "none", secure: true,  path: "/" }
    : { httpOnly: true, sameSite: "lax",  secure: false, path: "/" };
}
export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Registration Request Body:", body);

    const signupService = new SignupService();
    const user = await signupService.registerUser(body);
    const payload = {
      id: user.user_id,
      email: user.email,
      name: user.username,
      role: user.role,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant_name,
      currency: user.currency,
    };

    const access  = await signToken(payload);      
    const refresh = await signRefreshToken(payload); 

    const res = NextResponse.json({
      ok: true,
      message: "Registration and Login successful",
      id: user.user_id,
      name: user.username,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant_name,
      currency: user.currency
    }, { status: 201 });

    const attrs = cookieAttrsFor(req);
    res.cookies.set("token",         access,  { ...attrs, maxAge: 60 * 60 });
    res.cookies.set("refresh_token", refresh, { ...attrs, maxAge: 30 * 24 * 3600 });

    return res;

  } catch (error) {
    console.error("Registration Error:", error);

    let status = 500;
    if (
      error.message.includes("already exists") || 
      error.message.includes("Missing required fields")
    ) {
      status = 400;
    }

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: status }
    );
  }
}