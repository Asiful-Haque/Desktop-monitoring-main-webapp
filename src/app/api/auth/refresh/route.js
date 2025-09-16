import { NextResponse } from "next/server";
import { verifyRefreshToken, signToken, signRefreshToken } from "@/app/lib/auth";

function cookieAttrsFor(req) {
  const isHttps = new URL(req.url).protocol === "https:";
  return isHttps
    ? { httpOnly: true, sameSite: "none", secure: true,  path: "/" }
    : { httpOnly: true, sameSite: "lax",  secure: false, path: "/" };
}

//This is needed if you want refresh the token in client side...
//otherwise in ssr side middleware will take care of it...
export async function POST(req) {
  const cookie = req.headers.get("cookie") || "";
  const map = Object.fromEntries(cookie.split(";").map(s => s.trim().split("=")));
  const rt = map["refresh_token"];
  if (!rt) return NextResponse.json({ ok: false, error: "no_refresh" }, { status: 401 });

  const payload = await verifyRefreshToken(rt).catch(() => null);
  if (!payload) return NextResponse.json({ ok: false, error: "invalid_refresh" }, { status: 401 });

  const newAccess  = await signToken(payload);
  const newRefresh = await signRefreshToken(payload);

  const res = NextResponse.json({ ok: true });
  const attrs = cookieAttrsFor(req);
  res.cookies.set("token",         newAccess,  { ...attrs, maxAge: 60 * 60 });
  res.cookies.set("refresh_token", newRefresh, { ...attrs, maxAge: 30 * 24 * 3600 });
  return res;
}
