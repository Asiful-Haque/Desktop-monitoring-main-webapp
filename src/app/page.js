"use client";
import React, { useState } from "react";
import Image from "next/image";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);

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
            <form className="space-y-4">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
              >
                {isLogin ? "Login" : "Sign Up"}
              </button>
            </form>

            <p className="mt-4 text-center text-gray-200">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={toggleForm}
                className="text-green-300 font-semibold hover:underline"
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