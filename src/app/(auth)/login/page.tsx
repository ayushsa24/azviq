"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import PasswordInput from "@/components/PasswordInput";
import { Mail, LogIn, Bot } from "lucide-react";
import Link from "next/link";
import { useSession, signIn as nextAuthSignIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Login() {
  const { status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleGoogleSignIn = () => {
    nextAuthSignIn("google", { callbackUrl: "/dashboard" });
  };

  async function handleLogin() {
    setEmailError("");
    setLoading(true);

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setEmailError("Invalid email address");
      setLoading(false);
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
        setLoading(false);
        return;
      }

      if (result?.ok) {
        const res = await fetch("/api/auth/get-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (data.user?.id) {
          localStorage.setItem('userId', data.user.id);
          window.location.href = "/dashboard";
        } else {
          alert("Login failed");
          setLoading(false);
        }
      }
    } catch (err) {
      alert("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 overflow-y-auto ${theme === 'dark'
      ? 'bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]'
      : 'bg-gradient-to-br from-[#EAEAEA] via-[#FFFFFF] to-[#EAEAEA]'}`}>

      <div className={`w-full max-w-sm p-5 rounded-3xl shadow-xl backdrop-blur-md transition-all border ${theme === 'dark'
        ? 'bg-[#252525]/80 border-[#444]/50'
        : 'bg-white/90 border-[#DDD]/50'}`}>

        <div className="flex flex-col items-center mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-2 ${theme === 'dark' ? 'bg-[#444] text-white' : 'bg-[#DDD] text-[#252525]'}`}>
            A
          </div>
          <h1 className={`text-xl font-bold mb-0.5 ${theme === 'dark' ? 'text-white' : 'text-[#252525]'}`}>
            Welcome Back
          </h1>
          <p className={`text-[11px] text-center opacity-70 ${theme === 'dark' ? 'text-white' : 'text-[#545454]'}`}>
            Login to continue your journey
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          <div className="mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 transition-all
                  ${theme === 'dark'
                    ? 'bg-[#1A1A1A]/50 border-[#444] text-white focus:ring-[#666]'
                    : 'bg-white border-[#DDD] text-[#252525] focus:ring-[#999]'
                  } ${emailError ? 'border-red-500 focus:ring-red-500/30' : ''}`}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">Password</label>
            <PasswordInput
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              className="py-2 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2
              ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#252525] text-white hover:bg-[#333]'}`}
          >
            <LogIn className="w-3.5 h-3.5" />
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="relative my-4">
            <div className={`absolute inset-0 flex items-center ${theme === 'dark' ? 'opacity-10' : 'opacity-20'}`}><div className="w-full border-t border-current"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className={`${theme === 'dark' ? 'bg-[#252525] px-2 text-gray-400' : 'bg-white px-2 text-gray-500'}`}>Or continue with</span></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-2
              ${theme === 'dark'
                ? 'bg-transparent border-[#444] text-white hover:bg-white/5'
                : 'bg-white border-[#DDD] text-[#252525] hover:bg-gray-50'}`}
          >
            <Bot className="w-3.5 h-3.5" />
            Continue with Google
          </button>
        </form>

        <p className="text-center mt-4 text-[11px] opacity-70">
          Don't have an account?{" "}
          <Link href="/signup" className="font-bold underline cursor-pointer hover:opacity-100 transition-opacity">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}
