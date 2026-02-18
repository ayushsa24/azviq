"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import PasswordInput from "@/components/PasswordInput";
import { Mail, Lock, Eye, EyeOff, UserPlus, Check, X } from "lucide-react";
import Link from "next/link";

export default function Signup() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one capital letter");
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/\?]/.test(password)) {
      errors.push("Password must contain at least one symbol");
    }
    
    return errors;
  };

  async function handleSignup() {
  const newErrors: { [key: string]: string } = {};

  if (!email) {
    newErrors.email = "Email is required";
  }

  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    newErrors.password = passwordErrors.join(", ");
  }

  if (!confirmPassword) {
    newErrors.confirmPassword = "Please confirm your password";
  } else if (password !== confirmPassword) {
    newErrors.confirmPassword = "Passwords do not match";
  }

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  setErrors({});

  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success) {
      // ✅ Store user ID in localStorage and redirect to onboarding
      localStorage.setItem('userId', data.user.id);
      router.push("/onboarding");
    } else {
      alert(data.error || "Signup failed");
    }
  } catch (err) {
    alert("Something went wrong");
  }
}

  return (
    <div className={`min-h-screen flex items-center justify-center transition-all duration-300 p-4 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-[#252525] via-[#545454]/20 to-[#252525]' 
        : 'bg-gradient-to-br from-[#CFCFCF] via-[#7D7D7D]/20 to-[#CFCFCF]'
    }`}>

      <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl backdrop-blur-xl transition-all duration-300 border ${
        theme === 'dark' 
          ? 'bg-[#252525]/60 border-[#545454]/50' 
          : 'bg-white/90 border-[#7D7D7D]/50'
      }`}>
        
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl mb-3 transition-all duration-300 ${
            theme === 'dark' ? 'bg-[#7D7D7D] text-white' : 'bg-[#545454] text-white'
          }`}>
            A
          </div>
          <h1 className={`text-2xl font-bold mb-2 transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-[#252525]'
          }`}>
            Create Account
          </h1>
          <p className={`text-center transition-colors ${
            theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
          }`}>
            Start your journey with Ascend.ai
          </p>
        </div>

        {/* Email Input */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 transition-colors ${
            theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
          }`}>
            Email
          </label>
          <div className="relative">
            <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
              theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
            }`} />
            <input
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-200
                ${theme === 'dark' 
                  ? 'bg-[#545454]/50 border-[#7D7D7D] text-white placeholder-[#CFCFCF] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#545454]/70' 
                  : 'bg-white border-[#7D7D7D] text-[#252525] placeholder-[#545454] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#CFCFCF]/50'
                } ${errors.email ? 'border-red-500 focus:ring-red-500/50' : ''}`}
            />
          </div>
          {errors.email && (
            <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
              <X className="w-4 h-4" />
              <span>{errors.email}</span>
            </div>
          )}
        </div>

        {/* Password Input */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 transition-colors ${
            theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
          }`}>
            Password
          </label>
          <PasswordInput
            placeholder="Create a password"
            value={password}
            onChange={setPassword}
            className={`${errors.password ? 'border-red-500 focus:ring-red-500/50' : ''}`}
          />
          {errors.password && (
            <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
              <X className="w-4 h-4" />
              <span>{errors.password}</span>
            </div>
          )}
        </div>
        
        {/* Confirm Password Input */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 transition-colors ${
            theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
          }`}>
            Confirm Password
          </label>
          <PasswordInput
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            className={`${errors.confirmPassword ? 'border-red-500 focus:ring-red-500/50' : ''}`}
          />
          {errors.confirmPassword && (
            <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
              <X className="w-4 h-4" />
              <span>{errors.confirmPassword}</span>
            </div>
          )}
        </div>

        {/* Sign Up Button */}
        <button
          onClick={handleSignup}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2
            ${theme === 'dark'
              ? 'bg-[#7D7D7D] hover:bg-[#545454] text-white'
              : 'bg-[#7D7D7D] hover:bg-[#545454] text-white'
            }`}
        >
          <UserPlus className="w-5 h-5" />
          Sign Up
        </button>

        {/* Login Link */}
        <p className={`text-center mt-4 transition-colors ${
          theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
        }`}>
          Already have an account?{" "}
          <Link href="/login" className="text-[#7D7D7D] hover:text-[#545454] font-medium transition-colors duration-200">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}
