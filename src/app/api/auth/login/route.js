import { NextResponse } from "next/server";

import LoginService from "@/app/services/login/loginService";
import { signToken } from "@/app/lib/auth";

const loginService = new LoginService();

export async function POST(req) {
  try {
    const { email, password, role } = await req.json();
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password, and role are required" },
        { status: 400 }
      );
    }
    const user = await loginService.validateUser(email, password, role);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }
    // console.log("Calling for signing");
    const token = await signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    // console.log("Token signed successfully:", token);

    // ✅ Set the token as a secure HTTP-only cookie
    const response = NextResponse.json({
      message: "Login successful",
      role: user.role, // ✅ sending only role
    });

    // console.log("About to set cookie…");
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1 hour
      sameSite: "lax",
    });
    // console.log("Token added in cookie successfully:", token);
    console.log("Response:", response);
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
