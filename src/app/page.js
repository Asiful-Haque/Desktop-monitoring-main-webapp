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
  CheckCircle2,
} from "lucide-react";

import AnimatedBackground from "@/components/AnimatedBackground";
import CompanyInfoCard from "@/components/registercard/CompanyInfoCard"; 
import CurrencyInfoCard from "@/components/registercard/CurrencyInfoCard";

async function safeReadJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const SetupProgressBar = ({ step }) => {
  const steps = [
    { id: 1, label: "Company Details" },
    { id: 2, label: "Currency Setup" },
  ];

  return (
    <div className="w-full max-w-md mb-8 relative z-20 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center justify-between relative px-12">
        <div className="absolute left-16 right-16 top-1/2 -translate-y-1/2 h-1 bg-blue-900/30 rounded-full -z-10" />
        <div 
          className="absolute left-16 top-1/2 -translate-y-1/2 h-1 bg-blue-400 rounded-full -z-10 transition-all duration-500 ease-out"
          style={{ width: step === 2 ? "calc(100% - 8rem)" : "0%" }}
        />

        {steps.map((s) => {
          const isActive = step >= s.id;
          const isCompleted = step > s.id;
          
          return (
            <div key={s.id} className="flex flex-col items-center gap-2 relative bg-transparent">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
                  isActive
                    ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    : "bg-blue-950/80 border-blue-800 text-blue-500/50"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <span className="text-sm font-bold">{s.id}</span>}
              </div>
              <span 
                className={`absolute -bottom-6 w-32 text-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                  isActive ? "text-white" : "text-blue-200/40"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};


export default function LoginPage() {
  const router = useRouter();
  const nextDest = "/adminDashboard";

 
  const [isLogin, setIsLogin] = useState(true); 
  const [showWizard, setShowWizard] = useState(false); 
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animClass, setAnimClass] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [setupStep, setSetupStep] = useState(1); 
  const [registerData, setRegisterData] = useState({}); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPwd, setShowPwd] = useState(false);
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
    setAnimClass(toLogin ? "form-exit-right" : "form-exit-left");

    setSafeTimeout(() => {
      setIsLogin(toLogin);
      setAnimClass(toLogin ? "form-enter-left" : "form-enter-right");
      setSafeTimeout(() => {
        setAnimClass("");
        setIsTransitioning(false);
      }, 380);
    }, 260);
  };

  async function handleAuthSubmit(e) {
    e.preventDefault();
    if (isLoading || isTransitioning) return;
    setErr("");
    setOk("");

    if (isLogin) {
      setIsLoading(true);
      try {
        const payload = { email, password };
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await safeReadJson(res);
        if (!res.ok) throw new Error(data?.error || data?.message || "Invalid credentials");

        router.push(nextDest);
      } catch (ex) {
        setErr(ex?.message || "Login failed.");
        setIsLoading(false);
      }
    } 
    else {
      if (!username.trim()) {
        setErr("Username is required");
        return;
      }
      setRegisterData({ username: username.trim(), email, password });
      
      setErr(""); 
      setShowWizard(true); 
      setSetupStep(1); 
    }
  }


  const handleCompanyNext = (companyInfo) => {
    setRegisterData((prev) => ({ ...prev, ...companyInfo }));
    setSetupStep(2);
  };

const handleCurrencySubmit = async (currencyInfo) => {
    const finalPayload = {
      ...registerData,
      ...currencyInfo,
    };

    setIsLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "User with this email already exists") {
          setErr("User already exists! Try Again..."); 
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          
          return;
        }
        setErr(data.error);
        setIsLoading(false);
        return;
      }
      router.push("/adminDashboard");
    } catch (error) {
      console.error("Registration error:", error);
      setErr("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #095cfd 0%, #0b4dd5 45%, #063aa8 100%)",
      }}
    >
      <AnimatedBackground />

      <div className={`w-full max-w-md space-y-6 relative z-10 transition-all duration-500 ${showWizard ? "mb-4 scale-90" : "mb-8"}`}>
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div
              className={`p-5 rounded-2xl backdrop-blur-md transition-all duration-500 hover:scale-110 hover:rotate-3 ${isLogin && !showWizard ? "" : "rotate-6"}`}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <Activity className={`h-12 w-12 text-white drop-shadow-lg transition-transform duration-500 ${isLogin ? "" : "scale-110"}`} />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">Track Lively</h1>
          <p className="text-blue-100/90 text-lg font-light">Time & Task Management System</p>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {err && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 animate-in slide-in-from-top-2">{err}</div>}
        {ok && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 animate-in slide-in-from-top-2">{ok}</div>}
      </div>

      {!showWizard && (
        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-300">
          <Card
            className="border-0 backdrop-blur-xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(9, 92, 253, 0.2)",
              boxShadow: "0 25px 50px rgba(9, 92, 253, 0.3), 0 0 0 1px rgba(255,255,255,0.1) inset",
            }}
          >
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
                className={`flex-1 py-4 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${isLogin ? "" : "text-gray-400 hover:text-gray-600"}`}
                style={{ color: isLogin ? "#0b2a72" : undefined }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">Sign In</span>
                <div className={`absolute inset-0 bg-blue-50 transition-transform duration-300 ${isLogin ? "translate-y-0" : "translate-y-full"}`} />
              </button>
              <button
                type="button"
                onClick={() => handleToggle(false)}
                disabled={isTransitioning || isLoading}
                className={`flex-1 py-4 text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${!isLogin ? "" : "text-gray-400 hover:text-gray-600"}`}
                style={{ color: !isLogin ? "#0b2a72" : undefined }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">Register</span>
                <div className={`absolute inset-0 bg-blue-50 transition-transform duration-300 ${!isLogin ? "translate-y-0" : "translate-y-full"}`} />
              </button>
            </div>

            <CardHeader className="pb-2">
              <CardTitle style={{ color: "#0b2a72" }} className="text-xl">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-gray-500">
                {isLogin ? "Enter your credentials" : "Fill in your details to get started"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className={`${animClass || ""}`}>
                  {!isLogin && (
                    <div className="space-y-2 mt-4 field-appear" style={{ animationDelay: "100ms" }}>
                      <Label htmlFor="username" style={{ color: "#0b2a72" }}>Username</Label>
                      <div className="relative group w-full">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 border-blue-200"
                          placeholder="Username"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mt-4 field-appear" style={{ animationDelay: isLogin ? "0ms" : "250ms" }}>
                    <Label htmlFor="email" style={{ color: "#0b2a72" }}>Email</Label>
                    <div className="relative group w-full">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 border-blue-200"
                        placeholder="Email"
                        required
                        disabled={isLoading || isTransitioning}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 field-appear" style={{ animationDelay: isLogin ? "60ms" : "300ms" }}>
                    <Label htmlFor="password" style={{ color: "#0b2a72" }}>Password</Label>
                    <div className="relative group w-full">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                      <Input
                        id="password"
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 border-blue-200"
                        placeholder="Password"
                        required
                        disabled={isLoading || isTransitioning}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute inset-y-0 right-2 px-2 text-slate-500"
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-4 field-appear" style={{ animationDelay: isLogin ? "120ms" : "350ms" }}>
                    <span className="text-slate-600">{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
                    <a href="#" className="text-indigo-700 hover:underline font-semibold" onClick={(ev) => { if (!isLogin) { ev.preventDefault(); handleToggle(true); } }}>
                      {isLogin ? "Contact Admin" : "Sign In"}
                    </a>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-white font-semibold py-5 mt-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl field-appear"
                    style={{
                      background: "linear-gradient(135deg, #095cfd 0%, #0b4dd5 45%, #063aa8 100%)",
                      animationDelay: isLogin ? "160ms" : "400ms",
                    }}
                    disabled={isLoading || isTransitioning}
                  >
                    {isLoading ? "Loading..." : (
                      <span className="flex items-center justify-center gap-2">
                        {isLogin ? "Sign In" : "Create Account"} <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showWizard && (
        <>
          <SetupProgressBar step={setupStep} />
          {setupStep === 1 && (
            <div className="w-full max-w-md relative z-10">
               <CompanyInfoCard onNext={handleCompanyNext} />
            </div>
          )}

          {setupStep === 2 && (
            <div className="w-full max-w-md relative z-10">
               <CurrencyInfoCard onSubmit={handleCurrencySubmit} />
            </div>
          )}
        </>
      )}

      <p className="text-center text-blue-100/60 text-sm mt-6 relative z-10">
        © 2025 Track Lively. All rights reserved.
      </p>
    </div>
  );
}