"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const formDataToObject = Object.fromEntries(formData.entries());
    console.log("data is ", formDataToObject);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formDataToObject.email,
        password: formDataToObject.password,
        role: formDataToObject.role,
      }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      console.error("Login failed:", errorData);
      alert(`Login failed: ${errorData.error || "Unknown error"}`);
      return;
    }
    const data = await res.json();
    console.log("Login response:", data);
    localStorage.setItem('token', data.token);
    router.push('/assign_task');
    // Reset form fields after submission
    e.target.reset();
  };

  const toggleForm = () => setIsLogin(!isLogin);

  return (
    <div className="w-full min-h-screen font-sans bg-gradient-to-br from-green-600 to-blue-200 flex flex-col">
      {/* Full-width header above the two columns */}
      <div className="flex w-full py-6 md:pt-80 justify-center bg-opacity-20 backdrop-blur-sm">
        <h1 className="text-white  text-4xl md:text-6xl font-extrabold max-w-4xl text-center select-none">
          Task monitoring
        </h1>
      </div>

      {/* Two-column layout below */}
      <div className="flex flex-1 flex-col md:flex-row items-center md:mb-80">
        {/* Left: Image Section */}
        <div className="w-full md:flex-1 flex items-center justify-center px-6 md:px-0 md:ml-32">
          <div className="w-full max-w-xs md:max-w-sm lg:max-w-md aspect-square relative">
            <Image
              src="/login_image.png"
              alt="Login Visual"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Right: Login/Signup Form */}
        <div className="w-full md:flex-1 flex items-center justify-center px-6 md:px-0 md:mr-32">
          <div className="w-full max-w-md p-8 shadow-lg rounded-lg bg-opacity-20 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-center mb-6 text-white">
              {isLogin ? "Login" : "Sign Up"}
            </h2>
            <form onSubmit={handleLogin} className="space-y-4">
              {!isLogin && (
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-black"
                />
              )}
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
              <select
                name="role"
                className="w-full px-2 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                defaultValue=""
              >
                <option value="" disabled>
                  Select Role
                </option>
                <option value="Admin">Admin</option>
                <option value="Developer">Developer</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Team Lead">Team Lead</option>
              </select>

              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
              >
                {isLogin ? "Login" : "Sign Up"}
              </button>
            </form>

            <p className="mt-4 text-center text-gray-100">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={toggleForm}
                className="text-green-600 font-semibold hover:underline"
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
