"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import PasswordInput from "@/components/PasswordInput";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { theme, toggleTheme } = useTheme();

  async function handleLogin() {
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
    });
  }

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900'
    }`}>

      <div className={`relative p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-xl transition-colors duration-300 ${
        theme === 'dark' 
          ? 'bg-slate-800/50 border border-slate-700' 
          : 'bg-white/80 border border-gray-200'
      }`}>
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-slate-700"
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Welcome Back
        </h1>

        <p className={`text-center mb-6 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Login to continue ✨
        </p>

        <input
          placeholder="Email"
          className={`w-full p-3 mb-4 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${
            theme === 'dark' 
              ? 'bg-slate-700/80 border-indigo-500/30 text-white placeholder-gray-400 hover:bg-slate-700 hover:border-indigo-500/50' 
              : 'bg-white border-indigo-200 text-gray-900 placeholder-gray-500 hover:bg-gray-50 hover:border-indigo-300'
          }`}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordInput
          placeholder="Password"
          value={password}
          onChange={setPassword}
          className="mb-6"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 p-3 rounded-lg font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Login
        </button>

        <p className={`text-center mt-4 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Don't have an account?{" "}
          <a href="/signup" className="text-indigo-500 hover:text-indigo-400 hover:underline transition-colors duration-200">
            Sign Up
          </a>
        </p>

      </div>
    </div>
  );
}
