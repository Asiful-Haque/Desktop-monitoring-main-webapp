"use client";
import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextDest = searchParams?.get("next") || "/adminDashboard";

  const THEMES = [
    {
      key: "ocean",
      name: "Ocean",
      pageBg: "from-blue-500 via-blue-400 to-blue-900",
      panelGrad: "from-sky-500 via-blue-500 to-sky-600",
      buttonGrad: "from-sky-500 via-indigo-600 to-cyan-600",
      dot: "bg-sky-500",
    },
    {
      key: "tropical",
      name: "Tropical",
      pageBg: "from-emerald-600 via-teal-600 to-cyan-600",
      panelGrad: "from-emerald-500 via-teal-500 to-cyan-500",
      buttonGrad: "from-emerald-500 via-teal-600 to-cyan-600",
      dot: "bg-emerald-500",
    },
    {
      key: "ash",
      name: "Ash",
      pageBg: "from-neutral-900 via-slate-800 to-zinc-900",
      panelGrad: "from-zinc-700 via-slate-600 to-neutral-700",
      buttonGrad: "from-slate-800 via-zinc-700 to-neutral-800",
      dot: "bg-zinc-600",
    },
  ];

  const [themeKey, setThemeKey] = useState(THEMES[0].key);
  const theme = useMemo(() => THEMES.find(t => t.key === themeKey) || THEMES[0], [themeKey]);

  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const fd = new FormData(e.target);
    const payload = { email: fd.get("email"), password: fd.get("password") };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Invalid email or password");
        return;
      }
      e.target.reset();
      router.push(nextDest);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-b ${theme.pageBg}`}>
      {/* Card */}
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.35)] overflow-hidden">
        {/* ===== Animated background layer (BEHIND both panels) ===== */}
        <div className="absolute inset-0 z-0">
          {/* Aurora wash */}
          <div className="absolute -inset-20 animate-aurora opacity-[0.35]" />
          {/* Floating blur blobs */}
          <div className="absolute -top-12 -left-8 h-56 w-56 rounded-full bg-cyan-400 blur-3xl mix-blend-multiply animate-float-slow opacity-30" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-fuchsia-400 blur-3xl mix-blend-multiply animate-float-medium opacity-25" />
          <div className="absolute top-1/3 -right-10 h-52 w-52 rounded-full bg-emerald-400 blur-3xl mix-blend-multiply animate-float-fast opacity-20" />
        </div>

        {/* Content */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2">
          {/* Left panel */}
          <div className={`relative p-6 md:p-8 bg-gradient-to-br ${theme.panelGrad} min-h-[520px]`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="relative h-full rounded-xl border border-white/20 bg-white/5 p-6 flex flex-col">
              <div className="h-12 w-12 rounded-full bg-white/30 ring-2 ring-white/40 shadow-lg mb-6" />
              <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight">
                Welcome to TaskPro!
              </h2>
              <p className="mt-2 text-white/90 text-sm">Sign in to continue access</p>
              <div className="mt-auto pt-10 text-white/90 text-xs">https://twinforce.net/</div>
            </div>
          </div>

          {/* Right panel */}
          <div className="p-6 md:p-8 flex flex-col justify-center min-h-[520px]">
            <h3 className="text-3xl font-semibold text-slate-900 mb-10 text-center">Login</h3>

            {err ? (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {err}
              </div>
            ) : null}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-bold text-slate-800">
                  Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-80">
                      <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5M4 20a8 8 0 1 1 16 0z" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-md border border-slate-300 bg-white px-9 py-2 text-sm  placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-bold ">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center ">
                    <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-80">
                      <path fill="currentColor" d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2M9 6a3 3 0 1 1 6 0v2H9zm8 12H7v-8h10z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-md border border-slate-300 bg-white px-9 py-2 pr-16 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute inset-y-0 right-2 rounded-md px-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPwd ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2">Dont have an account?</label>
                <a href="/admin-contact" className="text-indigo-700 hover:underline font-semibold">
                  Contact Admin
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-full bg-gradient-to-r ${theme.buttonGrad} py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Logging in…
                  </span>
                ) : (
                  "LOGIN"
                )}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center">
              <div className="flex items-center gap-3">
                {THEMES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setThemeKey(t.key)}
                    aria-label={`Switch to ${t.name} theme`}
                    className={`h-4 w-4 rounded-full ring-2 ring-white shadow ${t.dot} ${
                      themeKey === t.key ? "outline outline-2 outline-offset-2 outline-slate-900/40" : ""
                    }`}
                    title={t.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local animation CSS */}
      <style jsx>{`
        /* Soft, slowly morphing aurora gradient */
        .animate-aurora {
          background: conic-gradient(
              from 180deg at 50% 50%,
              rgba(99, 102, 241, 0.55),
              rgba(168, 85, 247, 0.45),
              rgba(34, 197, 94, 0.45),
              rgba(56, 189, 248, 0.45),
              rgba(99, 102, 241, 0.55)
            ),
            radial-gradient(60% 60% at 30% 20%, rgba(255, 255, 255, 0.18), transparent 70%),
            radial-gradient(70% 70% at 80% 90%, rgba(255, 255, 255, 0.12), transparent 80%);
          filter: blur(40px);
          animation: auroraShift 18s ease-in-out infinite alternate;
        }
        @keyframes auroraShift {
          0% {
            transform: translateY(-8%) scale(1.05) rotate(0deg);
            opacity: 0.32;
          }
          50% {
            transform: translateY(4%) scale(1.07) rotate(8deg);
            opacity: 0.38;
          }
          100% {
            transform: translateY(-6%) scale(1.04) rotate(-6deg);
            opacity: 0.34;
          }
        }

        /* Floating blobs (parallax-like speeds) */
        .animate-float-slow {
          animation: floatY 22s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: floatY 18s ease-in-out infinite reverse;
        }
        .animate-float-fast {
          animation: floatY 14s ease-in-out infinite;
        }
        @keyframes floatY {
          0% {
            transform: translateY(0px) translateX(0px) scale(1);
          }
          25% {
            transform: translateY(-12px) translateX(8px) scale(1.03);
          }
          50% {
            transform: translateY(6px) translateX(-6px) scale(0.98);
          }
          75% {
            transform: translateY(-10px) translateX(-2px) scale(1.02);
          }
          100% {
            transform: translateY(0px) translateX(0px) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
