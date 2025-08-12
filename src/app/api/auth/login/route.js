import { NextResponse } from "next/server";
import { signToken } from "@/app/lib/auth";
import { LoginService } from "@/app/services/login/loginService";

const loginService = new LoginService();

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    console.log("Received login request with email:", email);
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email, password are required" },
        { status: 400 }
      );
    }
    console.log("Hello1");
    const user = await loginService.validateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }
    console.log("Hello2");
    console.log("validated user:", user);
    // console.log("Calling for signing");
    const token = await signToken({
      id: user.user_id,
      email: user.email,
      name: user.username,
      role: user.role, 
    });
    console.log("Token signed successfully with values:", user.role);

    // ✅ Set the token as a secure HTTP-only cookie
    const response = NextResponse.json({
      message: "Login successful",
      name: user.username,
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
