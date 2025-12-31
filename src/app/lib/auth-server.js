// src/lib/auth-server.js
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { signToken, verifyToken } from "./auth";



export async function getAuthFromCookie(req) {
  // console.log("getAuthFromCookie called with get time req:", req);
  if (!req) { //This is for direct cookie access 
    console.log("Its not req");
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");
    const token = tokenCookie?.value;
    if (token) return verifyToken(token);
  }
  if (req) {
    console.log("Its req");
    // This is for manual fetch where we forward the cookie in headers
    const cookieHeader = req.headers.get("cookie");
    console.log("Cookie Header received:", cookieHeader); // Log the cookie header
    if (cookieHeader) {
      const token = cookieHeader
        .split("; ")
        .find(c => c.startsWith("token="))
        ?.split("=")[1];
      if (token) {
        // console.log("Token extracted from header:", token); // Log the extracted token
        return verifyToken(token);
      }
    }
  }
  return null;
}


/** Read + verify JWT from Authorization: Bearer <token>. Returns claims or null. */
// export async function getAuthFromHeader() {
//   const auth = headers().get("authorization") || "";
//   if (!auth.toLowerCase().startsWith("bearer ")) return null;
//   const token = auth.slice(7);
//   return await verifyToken(token);
// }

/** Same as getAuthFromCookie but throws if missing/invalid (handy in API routes). */
// export async function requireAuth() {
//   const claims = await getAuthFromCookie();
//   if (!claims) throw new Error("Unauthorized");
//   return claims;
// }

// /** Set the HttpOnly auth cookie after login. */
// export async function setAuthCookie(payload, opts = {}) {
//   const {
//     maxAge = 60 * 60, // 1h
//     path = "/",
//     sameSite = "strict",
//     secure = process.env.NODE_ENV === "production",
//     httpOnly = true,
//   } = opts;

//   const token = await signToken(payload);
//   const res = NextResponse.next();
//   res.cookies.set("token", token, { httpOnly, secure, sameSite, path, maxAge });
//   return res; // return or merge its headers into your response
// }

/** Clear the auth cookie (logout). */
// export function clearAuthCookie() {
//   const res = NextResponse.next();
//   res.cookies.set("token", "", {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
//     path: "/",
//     maxAge: 0,
//   });
//   return res;
// }
