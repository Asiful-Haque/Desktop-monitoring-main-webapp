"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Login = () => {
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const formDataToObject = Object.fromEntries(formData.entries());

    const endpoint = "/api/auth/login";

    const res = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        email: formDataToObject.email,
        password: formDataToObject.password,
      }),
    });
    const data = await res.json();
    console.log("Response data:", data);
    // console.log("token:", data.token);
    if (!res.ok) {
      console.error("Login failed:", data);
      alert(`Login failed: ${data.error || "Unknown error"}`);
      return;
    }
    router.push("/adminDashboard");
    e.target.reset();
  };

  return (
    <div className="w-full min-h-screen font-sans bg-gradient-to-br from-green-600 to-blue-200 flex flex-col">
      {/* Full-width header above the two columns */}
      <div className="flex w-full py-6 md:pt-80 justify-center bg-opacity-20 backdrop-blur-sm">
        <h1 className="text-white text-4xl md:text-6xl font-extrabold max-w-4xl text-center select-none">
          Task monitoring
        </h1>
      </div>

      {/* Two-column layout below */}
      <div className="flex flex-1 flex-col md:flex-row items-center md:mb-80">
        {/* Left: Image Section */}
        {/* <div className="w-full md:flex-1 flex items-center justify-center px-6 md:px-0 md:ml-32">
          <div className="w-full max-w-xs md:max-w-sm lg:max-w-md aspect-square relative">
            <Image
              src="/login_image.png"
              alt="Login Visual"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div> */}

        {/* Right: Login Form */}
        <div className="w-full md:flex-1 flex items-center ml-25 justify-center px-6 md:px-0 md:mr-32">
          <div className="w-full max-w-md p-8 shadow-lg rounded-lg bg-opacity-20 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-center mb-6 text-white">Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-black"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-black"
              />
              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
              >
                Login
              </button>
            </form>

            <p className="mt-4 text-center text-gray-100">
              Don&apos;t have an account?{" "}
              <a
                href="/contact-admin"
                className="text-green-600 font-semibold hover:underline"
              >
                Contact Admin
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
