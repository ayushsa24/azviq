"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Mail, ArrowLeft, Loader2, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OtpInput from "@/components/auth/OtpInput";
import PasswordInput from "@/components/PasswordInput";

type Step = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";

export default function ForgotPassword() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // OTP state
  const [countdown, setCountdown] = useState(60);
  const [resetToken, setResetToken] = useState("");

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "OTP" && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "PASSWORD_RESET" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      
      setStep("OTP");
      setCountdown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, type: "PASSWORD_RESET" }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setResetToken(data.resetToken);
      setStep("NEW_PASSWORD");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Reset failed");

      setStep("SUCCESS");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 overflow-y-auto ${theme === 'dark'
      ? 'bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]'
      : 'bg-gradient-to-br from-[#EAEAEA] via-[#FFFFFF] to-[#EAEAEA]'}`}>

      <div className={`w-full max-w-sm p-8 rounded-3xl shadow-2xl backdrop-blur-md border transition-all ${theme === 'dark'
        ? 'bg-[#252525]/80 border-[#444]/50 text-white'
        : 'bg-white/90 border-[#DDD]/50 text-[#252525]'}`}>

        {step === "EMAIL" && (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className={`p-4 rounded-2xl mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-[#252525]/5'}`}>
                <Mail className={`w-8 h-8 ${theme === 'dark' ? 'text-white' : 'text-[#252525]'}`} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Forgot Password?</h1>
              <p className={`text-xs text-center opacity-60 px-4 leading-relaxed`}>
                Enter your email address and we'll send you a 6-digit code to reset your password.
              </p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-50 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2
                      ${theme === 'dark'
                        ? 'bg-[#1A1A1A]/50 border-[#444] text-white focus:ring-white/10'
                        : 'bg-white border-[#DDD] text-[#252525] focus:ring-black/5'}`}
                  />
                </div>
              </div>

              {error && (
                <div className={`p-4 rounded-xl text-xs flex flex-col items-center gap-2 border ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50/10 border-red-200 text-red-600'}`}>
                  <span>{error}</span>
                  {error.includes("sign up") && (
                    <Link href="/signup" className="font-bold underline uppercase tracking-tighter">
                      Create Account Now
                    </Link>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]
                  ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#252525] text-white hover:bg-[#333]'}`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Code"}
              </button>
            </form>
          </>
        )}

        {step === "OTP" && (
          <div className="flex flex-col items-center py-2">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Check Email</h1>
            <p className="text-xs text-center opacity-70 mb-8 leading-relaxed">
              We've sent a 6-digit code to <span className="font-bold opacity-100">{email}</span>.
            </p>

            <OtpInput 
              length={6} 
              onComplete={handleVerifyOtp} 
              error={!!error}
              disabled={loading}
            />
            {error && <p className="text-red-500 text-[10px] text-center font-bold mt-4">{error}</p>}

            <button
              onClick={() => handleSendOtp()}
              disabled={countdown > 0 || loading}
              className="text-[10px] mt-8 uppercase font-bold tracking-widest text-center opacity-50 hover:opacity-100 disabled:hover:opacity-50 transition-opacity"
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
            </button>
          </div>
        )}

        {step === "NEW_PASSWORD" && (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className={`p-4 rounded-2xl mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-[#252525]/5'}`}>
                <Lock className={`w-8 h-8 ${theme === 'dark' ? 'text-white' : 'text-[#252525]'}`} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Reset Password</h1>
              <p className={`text-xs text-center opacity-60`}>Choose a new secure password for your account.</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-50 ml-1">New Password</label>
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="••••••••"
                  className="py-3"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-50 ml-1">Confirm New Password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="••••••••"
                  className="py-3"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]
                  ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#252525] text-white hover:bg-[#333]'}`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </button>
            </form>
          </>
        )}

        {step === "SUCCESS" && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className={`p-4 rounded-full mb-6 ${theme === 'dark' ? 'bg-green-500/10' : 'bg-green-500/5'}`}>
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Password Updated!</h1>
            <p className="text-xs opacity-60 mb-8 leading-relaxed">
              Your password has been reset successfully. Redirecting you to login...
            </p>
            <div className="w-8 h-8 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
          </div>
        )}

        {step === "EMAIL" && (
          <div className="mt-8 flex justify-center">
            <Link 
              href="/login" 
              className="flex items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
