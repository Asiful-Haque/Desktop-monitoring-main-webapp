import { NextResponse } from "next/server";
import { verifyRefreshToken, signToken, signRefreshToken } from "@/app/lib/auth";

const BASE_COOKIE = { httpOnly: true, secure: true, sameSite: "none", path: "/" };

//This is needed if you want refresh the token in client side...
//otherwise in ssr side middleware will take care of it...
export async function POST(req) {
  console.log("Refresh endpoint called **********");
  const cookie = req.headers.get("cookie") || "";
  console.log("Cookies received in refresh endpoint:", cookie);
  const pairs = cookie.split(";").map(s => s.trim().split("="));
  console.log("Cookie pairs:", pairs);
  const map = Object.fromEntries(pairs);
  console.log("Cookie map:", map);
  const rt = map["refresh_token"];
  // console.log("Refresh token extracted:", rt);
  if (!rt) return NextResponse.json({ ok: false, error: "no_refresh" }, { status: 401 });

  const payload = await verifyRefreshToken(rt);
  console.log("Refresh token payload%%%%%%%%%%%%%:", payload);
  if (!payload) return NextResponse.json({ ok: false, error: "invalid_refresh" }, { status: 401 });

  // rotate both tokens
  const newAccess  = await signToken(payload);
  console.log("New access token generated: after calling new refresh ", newAccess);
  const newRefresh = await signRefreshToken(payload);
  console.log("New refresh token generated: after calling new refresh ", newRefresh);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("token",  newAccess,  { ...BASE_COOKIE, maxAge: 60 * 60 });
  res.cookies.set("refresh_token", newRefresh, { ...BASE_COOKIE, maxAge: 30 * 24 * 3600 });
  return res;
}
