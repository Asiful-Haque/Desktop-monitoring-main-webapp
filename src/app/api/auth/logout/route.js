// // src/app/api/auth/logout/route.js
// import { NextResponse } from "next/server";
// import { corsJson, corsEmpty } from "@/app/lib/coreResponse"; // if you use CORS helpers

// export async function POST() {
//   try {
//     const res = NextResponse.json({ message: "Logged out successfully" });

//     // ✅ Clear the cookie (set expiration in the past)
//     res.cookies.set("token", "", {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       path: "/",
//       expires: new Date(0), // Expire immediately
//     });

//     return res;
//   } catch (error) {
//     console.error("❌ Logout error:", error);
//     return NextResponse.json({ error: "Logout failed" }, { status: 500 });
//   }
// }

// // Optional: Allow OPTIONS for CORS preflight
// export async function OPTIONS() {
//   return corsEmpty();
// }



import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ message: "Logged out successfully" });
  res.cookies.set("token",  "", { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 0 });
  res.cookies.set("refresh_token","", { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 0 });
  return res;
}


export async function OPTIONS() {
  return corsEmpty();
}