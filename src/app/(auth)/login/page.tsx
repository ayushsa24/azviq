"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import PasswordInput from "@/components/PasswordInput";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const { theme } = useTheme();

  async function handleLogin() {
    setEmailError("");

    // Valid Email Check before sending request
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        alert("Invalid email or password");
        return;
      }

      if (result?.ok) {
        // Get user data and set userId in localStorage
        const res = await fetch("/api/auth/get-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (data.user?.id) {
          localStorage.setItem('userId', data.user.id);
          window.location.href = "/dashboard";
        } else {
          alert("Login failed");
        }
      }
    } catch (err) {
      alert("Something went wrong");
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-all duration-300 p-4 ${theme === 'dark'
        ? 'bg-gradient-to-br from-[#252525] via-[#545454]/20 to-[#252525]'
        : 'bg-gradient-to-br from-[#CFCFCF] via-[#7D7D7D]/20 to-[#CFCFCF]'
        }`}
      onKeyPress={handleKeyPress}
    >

      <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl backdrop-blur-xl transition-all duration-300 border ${theme === 'dark'
        ? 'bg-[#252525]/60 border-[#545454]/50'
        : 'bg-white/90 border-[#7D7D7D]/50'
        }`}>

        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl mb-3 transition-all duration-300 ${theme === 'dark' ? 'bg-[#7D7D7D] text-white' : 'bg-[#545454] text-white'
            }`}>
            A
          </div>
          <h1 className={`text-2xl font-bold mb-2 transition-colors ${theme === 'dark' ? 'text-white' : 'text-[#252525]'
            }`}>
            Welcome Back
          </h1>
          <p className={`text-center transition-colors ${theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
            }`}>
            Login to continue to Ascend.ai
          </p>
        </div>

        {/* Email Input */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
            }`}>
            Email
          </label>
          <div className="relative">
            <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
              }`} />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-200
                ${theme === 'dark'
                  ? 'bg-[#545454]/50 border-[#7D7D7D] text-white placeholder-[#CFCFCF] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#545454]/70'
                  : 'bg-white border-[#7D7D7D] text-[#252525] placeholder-[#545454] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#CFCFCF]/50'
                } ${emailError ? 'border-red-500 focus:ring-red-500/50' : ''}`}
            />
          </div>
          {emailError && (
            <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
              <span>{emailError}</span>
            </div>
          )}
        </div>

        {/* Password Input */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
            }`}>
            Password
          </label>
          <PasswordInput
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            className=""
          />
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2
            ${theme === 'dark'
              ? 'bg-[#7D7D7D] hover:bg-[#545454] text-white'
              : 'bg-[#7D7D7D] hover:bg-[#545454] text-white'
            }`}
        >
          <LogIn className="w-5 h-5" />
          Login
        </button>

        {/* Sign Up Link */}
        <p className={`text-center mt-4 transition-colors ${theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
          }`}>
          Don't have an account?{" "}
          <Link href="/signup" className="text-[#7D7D7D] hover:text-[#545454] font-medium transition-colors duration-200">
            Sign Up
          </Link>
        </p>

      </div>
    </div>
  );
}
