// app/api/auth/login/cron/route.ts (or route.js)
import { NextResponse } from "next/server";

import { signToken, signRefreshToken } from "@/app/lib/auth";
import { LoginService } from "@/app/services/login/loginService";

// Cron job login endpoint (no cookies, only tokens)
export async function POST(req) {
  const { email, password, isCronJob } = await req.json();  // Retrieve isCronJob flag from request body
  
  if (!isCronJob) {
    return NextResponse.json({ error: "This request is not from a cron job." }, { status: 403 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Email, password are required" }, { status: 400 });
  }

  const loginService = new LoginService();
  const user = await loginService.validateUser(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Create payload for token (you can still leave this as is)
  const payload = {
    id: user.user_id,
    email: user.email,
    name: user.username,
    role: user.role,
    tenant_id: user.tenant_id,
    tenant_name: user.tenant_name,
  };

  // Generate cron access and refresh tokens
  const cronAccess = await signToken(payload);        // 1h expiration for cron access token
  const cronRefresh = await signRefreshToken(payload); // 30d expiration for cron refresh token

  // Return tokens for cron job (no cookies)
  return NextResponse.json({
    ok: true,
    message: "Login successful",
    cron_access_token: cronAccess,     
    cron_refresh_token: cronRefresh,  
    user: {
      id: user.user_id,
      email: user.email,
      name: user.username,
      role: user.role,
      tenant_id: user.tenant_id,
      tenant_name: user.tenant_name,
    }
  });
}
