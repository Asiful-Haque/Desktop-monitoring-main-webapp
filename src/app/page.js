"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

// Adjust path based on where you saved the file above
import AnimatedBackground from "@/components/AnimatedBackground"; 

async function safeReadJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const nextDest = "/adminDashboard";

  const [isLogin, setIsLogin] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animClass, setAnimClass] = useState("");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const timeoutsRef = useRef([]);

  const setSafeTimeout = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
  };

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  const handleToggle = (toLogin) => {
    if (toLogin === isLogin || isTransitioning || isLoading) return;

    setErr("");
    setOk("");
    setIsTransitioning(true);

    // exit animation
    setAnimClass(toLogin ? "form-exit-right" : "form-exit-left");

    setSafeTimeout(() => {
      // swap content
      setIsLogin(toLogin);

      // enter animation
      setAnimClass(toLogin ? "form-enter-left" : "form-enter-right");

      setSafeTimeout(() => {
        setAnimClass("");
        setIsTransitioning(false);
      }, 380);
    }, 260);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (isLoading || isTransitioning) return;

    setErr("");
    setOk("");
    setIsLoading(true);

    try {
      if (isLogin) {
        const payload = { email, password };
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await safeReadJson(res);
        if (!res.ok) {
          throw new Error(
            data?.error || data?.message || "Invalid email or password"
          );
        }

        router.push(nextDest);
      } else {
        // Validation for Register
        if (!username.trim()) throw new Error("Username is required");

        const payload = {
          username: username.trim(),
          email,
          password,
        };

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await safeReadJson(res);
        if (!res.ok) {
          throw new Error(
            data?.error || data?.message || "Registration failed"
          );
        }

        setOk("Registration successful! Redirecting...");
        setTimeout(() => router.push(nextDest), 1500);
      }
    } catch (ex) {
      setErr(ex?.message || "Request failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{
        background:
          "linear-gradient(135deg, #095cfd 0%, #0b4dd5 45%, #063aa8 100%)",
      }}
    >
      {/* ================= BACKGROUND COMPONENT ================= */}
      <AnimatedBackground />

      {/* ================= MAIN CONTENT ================= */}
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div
              className={`p-5 rounded-2xl backdrop-blur-md transition-all duration-500 hover:scale-110 hover:rotate-3 ${
                isLogin ? "" : "rotate-6"
              }`}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <Activity
                className={`h-12 w-12 text-white drop-shadow-lg transition-transform duration-500 ${
                  isLogin ? "" : "scale-110"
                }`}
              />
            </div>
          </div>

          <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">
            Track Lively
          </h1>
          <p className="text-blue-100/90 text-lg font-light">
            Time & Task Management System
          </p>
        </div>

        {/* Card */}
        <Card
          className="border-0 backdrop-blur-xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(9, 92, 253, 0.2)",
            boxShadow:
              "0 25px 50px rgba(9, 92, 253, 0.3), 0 0 0 1px rgba(255,255,255,0.1) inset",
          }}
        >
          {/* Tabs */}
          <div className="flex border-b border-blue-100 relative">
            <div
              className="absolute bottom-0 h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 transition-all duration-500 ease-out"
              style={{
                width: "50%",
                left: isLogin ? "0%" : "50%",
                boxShadow: "0 0 10px rgba(9, 92, 253, 0.5)",
              }}
            />
            <button
              type="button"
              onClick={() => handleToggle(true)}
              disabled={isTransitioning || isLoading}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
                isLogin ? "" : "text-gray-400 hover:text-gray-600"
              }`}
              style={{ color: isLogin ? "#0b2a72" : undefined }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Sign In
                {isLogin && (
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </span>
              <div
                className={`absolute inset-0 bg-blue-50 transition-transform duration-300 ${
                  isLogin ? "translate-y-0" : "translate-y-full"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => handleToggle(false)}
              disabled={isTransitioning || isLoading}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
                !isLogin ? "" : "text-gray-400 hover:text-gray-600"
              }`}
              style={{ color: !isLogin ? "#0b2a72" : undefined }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Register
                {!isLogin && (
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </span>
              <div
                className={`absolute inset-0 bg-blue-50 transition-transform duration-300 ${
                  !isLogin ? "translate-y-0" : "translate-y-full"
                }`}
              />
            </button>
          </div>

          <div className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle style={{ color: "#0b2a72" }} className="text-xl">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-gray-500">
                {isLogin
                  ? "Enter your credentials to access your dashboard"
                  : "Fill in your details to get started"}
              </CardDescription>

              {err ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {err}
                </div>
              ) : null}
              {ok ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {ok}
                </div>
              ) : null}
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className={`${animClass || ""}`}>
                  {/* === Register-only Fields === */}
                  {!isLogin && (
                    <>
                      {/* Username */}
                      <div
                        className="space-y-2 mt-4 field-appear"
                        style={{ animationDelay: "100ms" }}
                      >
                        <Label htmlFor="username" style={{ color: "#0b2a72" }}>
                          Username
                        </Label>
                        <div className="relative group w-full">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 group-focus-within:text-blue-600" />
                          <Input
                            id="username"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20"
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email */}
                  <div
                    className="space-y-2 mt-4 field-appear"
                    style={{ animationDelay: isLogin ? "0ms" : "250ms" }}
                  >
                    <Label htmlFor="email" style={{ color: "#0b2a72" }}>
                      Email
                    </Label>
                    <div className="relative group w-full">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 group-focus-within:text-blue-600" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                        required
                        disabled={isLoading || isTransitioning}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div
                    className="space-y-2 mt-4 field-appear"
                    style={{ animationDelay: isLogin ? "60ms" : "300ms" }}
                  >
                    <Label htmlFor="password" style={{ color: "#0b2a72" }}>
                      Password
                    </Label>
                    <div className="relative group w-full">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 group-focus-within:text-blue-600" />
                      <Input
                        id="password"
                        type={showPwd ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                        required
                        disabled={isLoading || isTransitioning}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute inset-y-0 right-2 rounded-md px-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                        tabIndex={-1}
                      >
                        {showPwd ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Footer Links */}
                  <div
                    className="flex items-center justify-between text-xs mt-4 field-appear"
                    style={{
                      animationDelay: isLogin ? "120ms" : "350ms",
                    }}
                  >
                    <span className="text-slate-600">
                      {isLogin
                        ? "Don't have an account?"
                        : "Already have an account?"}
                    </span>
                    <a
                      href={isLogin ? "/admin-contact" : "#"}
                      className="text-indigo-700 hover:underline font-semibold"
                      onClick={(ev) => {
                        if (!isLogin) {
                          ev.preventDefault();
                          handleToggle(true);
                        }
                      }}
                    >
                      {isLogin ? "Contact Admin" : "Sign In"}
                    </a>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full text-white font-semibold py-5 mt-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl group field-appear"
                    style={{
                      background:
                        "linear-gradient(135deg, #095cfd 0%, #0b4dd5 45%, #063aa8 100%)",
                      boxShadow: "0 8px 25px rgba(9, 92, 253, 0.4)",
                      animationDelay: isLogin ? "160ms" : "400ms",
                    }}
                    disabled={isLoading || isTransitioning}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {isLogin ? "Logging in..." : "Creating account..."}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {isLogin ? "Sign In" : "Create Account"}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </div>
        </Card>

        <p className="text-center text-blue-100/60 text-sm">
          © 2025 Track Lively. All rights reserved.
        </p>
      </div>
    </div>
  );
}