// app/api/auth/login/route.ts (or route.js)
import { NextResponse } from "next/server";
import { LoginService } from "@/app/services/login/loginService";
import { signToken, signRefreshToken } from "@/app/lib/auth";

function cookieAttrsFor(req) {
  const isHttps = new URL(req.url).protocol === "https:";
  return isHttps
    ? { httpOnly: true, sameSite: "none", secure: true,  path: "/" }
    : { httpOnly: true, sameSite: "lax",  secure: false, path: "/" };
}

export async function POST(req) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email, password are required" }, { status: 400 });
  }

  const loginService = new LoginService();
  const user = await loginService.validateUser(email, password);
  console.log("uuuu",user);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const payload = {
    id: user.user_id,
    email: user.email,
    name: user.username,
    role: user.role,
    tenant_id: user.tenant_id,
    tenant_name: user.tenant_name,
    currency: user.currency,
  };

  const access  = await signToken(payload);        // 1h
  const refresh = await signRefreshToken(payload); // 30d

  const res = NextResponse.json({
    ok: true,
    message: "Login successful",
    name: user.username,
    id: user.user_id,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id,
    tenant_name: user.tenant_name,
  });

  const attrs = cookieAttrsFor(req);
  res.cookies.set("token",         access,  { ...attrs, maxAge: 60 * 60 });
  res.cookies.set("refresh_token", refresh, { ...attrs, maxAge: 30 * 24 * 3600 });
  return res;
}
