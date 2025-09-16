// import { NextResponse } from "next/server";
// import { signToken } from "@/app/lib/auth";
// import { LoginService } from "@/app/services/login/loginService";
// import { Big_Shoulders } from "next/font/google";

// const loginService = new LoginService();

// export async function POST(req) {
//   try {
//     const { email, password } = await req.json();
//     console.log("Received login request with email:", email);
//     if (!email || !password) {
//       return NextResponse.json(
//         { error: "Email, password are required" },
//         { status: 400 }
//       );
//     }
//     console.log("Hello1");
//     const user = await loginService.validateUser(email, password);
//     if (!user) {
//       return NextResponse.json(
//         { error: "Invalid credentials" },
//         { status: 401 }
//       );
//     }
//     console.log("Hello2");
//     console.log("validated user:", user);
//     // console.log("Calling for signing");
//     const token = await signToken({
//       id: user.user_id,
//       email: user.email,
//       name: user.username,
//       role: user.role,
//       tenant_id: user.tenant_id,
//       tenant_name: user.tenant_name, 
//     });
//     console.log("Token signed successfully with values:", user.role);

//     // ✅ Set the token as a secure HTTP-only cookie
//     const response = NextResponse.json({
//       message: "Login successful",
//       name: user.username,
//       id : user.user_id,
//       email: user.email,
//       role: user.role,
//       tenant_id: user.tenant_id,
//       tenant_name: user.tenant_name,
//     });

//     console.log("About to set cookie…...........with token:", token);
//     response.cookies.set("token", token, {
//       httpOnly: true,
//       // secure: process.env.NODE_ENV === "production",
//       secure: true,
//       maxAge: 60 * 60, // 1 hour
//       // sameSite: "lax", 
//       sameSite: "none", 
//     });
//     console.log("Token added in cookie successfully:", token);
//     console.log("Response:", response);
//     return response;
//   } catch (error) {
//     return NextResponse.json({ error: "Failed to login" }, { status: 500 });
//   }
// }


// app/api/auth/login/route.ts (or route.js)
import { NextResponse } from "next/server";
import { LoginService } from "@/app/services/login/loginService";
import { signToken, signRefreshToken } from "@/app/lib/auth";

const loginService = new LoginService();
const BASE_COOKIE = { httpOnly: true, secure: true, sameSite: "none", path: "/" };

export async function POST(req) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email, password are required" }, { status: 400 });
  }

  const user = await loginService.validateUser(email, password);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const payload = {
    id: user.user_id,
    email: user.email,
    name: user.username,
    role: user.role,
    tenant_id: user.tenant_id,
    tenant_name: user.tenant_name,
  };

  const access  = await signToken(payload);        // 1h
  const refresh = await signRefreshToken(payload); // 30d

  const response = NextResponse.json({
    message: "Login successful",
    name: user.username,
    id: user.user_id,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id,
    tenant_name: user.tenant_name,
  });

  // ⬇️ Keep access cookie name as `token` (what your page expects)
  response.cookies.set("token", access, { ...BASE_COOKIE, maxAge: 60 * 60 });                 // 1h
  response.cookies.set("refresh_token", refresh, { ...BASE_COOKIE, maxAge: 30 * 24 * 3600 }); // 30d
  return response;
}
