"use client";

import React, { useId, useMemo } from "react";

/** deterministic hash */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** seeded RNG */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function AnimatedBackground() {
  const uid = useId();

  // ✅ SSR-safe “random” dots (deterministic on server + client)
  const dots = useMemo(() => {
    const seed = hashString(uid);
    const rnd = mulberry32(seed);

    return Array.from({ length: 20 }).map(() => ({
      top: `${rnd() * 100}%`,
      left: `${rnd() * 100}%`,
      floatDur: `${2.5 + rnd() * 2.5}s`,
      floatDelay: `${rnd() * 0.8}s`,
      twinkleDur: `${1.2 + rnd() * 1.2}s`,
      twinkleDelay: `${rnd() * 0.6}s`,
    }));
  }, [uid]);

  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 1. Animated Gradient Orbs */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
            top: "-200px",
            right: "-100px",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
            bottom: "-150px",
            left: "-100px",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(circle, rgba(100,200,255,0.4) 0%, transparent 70%)",
            top: "40%",
            left: "10%",
            animation: "float 6s ease-in-out infinite 1s",
          }}
        />

        {/* 2. Geometric Shapes (Square, Circle, etc) */}
        {/* Floating Square */}
        <div
          className="absolute w-20 h-20 border-2 border-white/20 rotate-45"
          style={{
            top: "15%",
            left: "15%",
            animation:
              "spin 12s linear infinite, float 3.6s ease-in-out infinite",
          }}
        />

        {/* Floating Circle */}
        <div
          className="absolute w-32 h-32 border-2 border-white/10 rounded-full"
          style={{
            top: "25%",
            right: "20%",
            animation:
              "pulse 4s ease-in-out infinite, float 7s ease-in-out infinite",
          }}
        />

        {/* Small Tilted Square */}
        <div
          className="absolute w-16 h-16 border-2 border-white/15 rotate-12"
          style={{
            bottom: "20%",
            right: "15%",
            animation:
              "spin 15s linear infinite reverse, float 6s ease-in-out infinite 0.5s",
          }}
        />

        {/* Rounded Rect */}
        <div
          className="absolute w-24 h-24 border-2 border-white/10 rounded-lg rotate-45"
          style={{
            bottom: "30%",
            left: "20%",
            animation:
              "spin 25s linear infinite, float 8s ease-in-out infinite 2s",
          }}
        />

        {/* 3. Hexagons & Polygons */}
        <div
          className="absolute top-1/4 right-1/4 w-40 h-40 opacity-10"
          style={{
            clipPath:
              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            background: "linear-gradient(135deg, white, transparent)",
            animation:
              "float 5.5s ease-in-out infinite 1s, spin 14s linear infinite reverse",
          }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-32 h-32 opacity-10"
          style={{
            clipPath:
              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            background: "linear-gradient(135deg, white, transparent)",
            animation:
              "float 9s ease-in-out infinite 1s, spin 25s linear infinite reverse",
          }}
        />

        {/* Triangle */}
        <div
          className="absolute top-1/2 right-[10%] w-20 h-20 opacity-15"
          style={{
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            background: "white",
            animation: "float 7s ease-in-out infinite, spin 20s linear infinite",
          }}
        />

        {/* 4. SSR-safe Dots */}
        {dots.map((d, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            style={{
              top: d.top,
              left: d.left,
              animation: `float ${d.floatDur} ease-in-out infinite ${d.floatDelay}, twinkle ${d.twinkleDur} ease-in-out infinite ${d.twinkleDelay}`,
            }}
          />
        ))}

        {/* 5. Waves */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="waveGradient1"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient
              id="waveGradient2"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          <path
            d="M-100,250 C150,150 350,350 600,250 C850,150 1050,350 1300,250 C1550,150 1750,350 2000,250"
            fill="none"
            stroke="url(#waveGradient1)"
            strokeWidth="2"
            style={{ animation: "wave 8s ease-in-out infinite" }}
          />
          <path
            d="M-100,350 C150,450 350,250 600,350 C850,450 1050,250 1300,350 C1550,450 1750,250 2000,350"
            fill="none"
            stroke="url(#waveGradient2)"
            strokeWidth="2"
            style={{ animation: "wave 10s ease-in-out infinite reverse" }}
          />
          <path
            d="M-100,450 C150,350 350,550 600,450 C850,350 1050,550 1300,450 C1550,350 1750,550 2000,450"
            fill="none"
            stroke="url(#waveGradient1)"
            strokeWidth="1.5"
            style={{ animation: "wave 12s ease-in-out infinite 1s" }}
          />
        </svg>

        {/* 6. Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            animation: "gridMove 20s linear infinite",
          }}
        />

        {/* 7. Light Beams */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-20"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 0%, transparent 0deg, rgba(255,255,255,0.1) 30deg, transparent 60deg, transparent 300deg, rgba(255,255,255,0.1) 330deg, transparent 360deg)",
            animation: "rotate 30s linear infinite",
          }}
        />

        {/* 8. Corner Accents */}
        <div className="absolute top-0 left-0 w-96 h-96">
          <div
            className="absolute top-10 left-10 w-64 h-64 border border-white/10 rounded-full"
            style={{ animation: "pulse 6s ease-in-out infinite" }}
          />
          <div
            className="absolute top-20 left-20 w-48 h-48 border border-white/5 rounded-full"
            style={{ animation: "pulse 6s ease-in-out infinite 0.5s" }}
          />
        </div>
        <div className="absolute bottom-0 right-0 w-96 h-96">
          <div
            className="absolute bottom-10 right-10 w-64 h-64 border border-white/10 rounded-full"
            style={{ animation: "pulse 6s ease-in-out infinite 1s" }}
          />
          <div
            className="absolute bottom-20 right-20 w-48 h-48 border border-white/5 rounded-full"
            style={{ animation: "pulse 6s ease-in-out infinite 1.5s" }}
          />
        </div>
      </div>

      {/* ================= ANIMATION STYLES ================= */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(3deg);
          }
        }
        @keyframes wave {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-50px);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.5;
          }
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.5);
          }
        }
        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
        @keyframes rotate {
          from {
            transform: translateX(-50%) rotate(0deg);
          }
          to {
            transform: translateX(-50%) rotate(360deg);
          }
        }

        /* Smooth panel transitions */
        @keyframes slideOutLeft {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(-30px) scale(0.95);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(30px) scale(0.95);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes fieldAppear {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-exit-left {
          animation: slideOutLeft 0.26s ease-out forwards;
        }
        .form-enter-right {
          animation: slideInRight 0.38s ease-out forwards;
        }
        .form-exit-right {
          animation: slideOutRight 0.26s ease-out forwards;
        }
        .form-enter-left {
          animation: slideInLeft 0.38s ease-out forwards;
        }
        .field-appear {
          animation: fieldAppear 0.42s ease-out both;
        }
      `}</style>
    </>
  );
}