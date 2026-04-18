"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import PasswordInput from "@/components/PasswordInput";
import { Mail, UserPlus, Check, X, Bot } from "lucide-react";
import Link from "next/link";
import { signIn as nextAuthSignIn } from "next-auth/react";
import OtpInput from "@/components/auth/OtpInput";

export default function Signup() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [otpCode, setOtpCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'verify' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("Min 8 chars");
    if (!/[A-Z]/.test(password)) errors.push("Need uppercase");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/\?]/.test(password)) errors.push("Need symbol");
    return errors;
  };

  async function handleSignup() {
    const newErrors: { [key: string]: string } = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) newErrors.email = "Required";
    else if (!emailPattern.test(email)) newErrors.email = "Invalid email";

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) newErrors.password = passwordErrors[0];

    if (!confirmPassword) newErrors.confirmPassword = "Required";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Mismatch";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsVerifying(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success && data.data.step === 'verify') {
        setStep('verify');
        setCountdown(60);
      } else {
        alert(data.error?.message || "Signup failed");
      }
    } catch (err) {
      alert("Something went wrong");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleVerify(code: string) {
    setIsVerifying(true);
    setVerifyError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, type: "SIGNUP" }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setVerifyError(data.error || "Verification failed");
        setOtpCode(""); // reset input so user can try again
        return;
      }

      setSuccessMessage("Account verified!");
      
      // Auto-login after successful verification
      await nextAuthSignIn("credentials", {
        email,
        password,
        callbackUrl: "/onboarding",
        redirect: true
      });
    } catch (err) {
      setVerifyError("Something went wrong");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResendCode() {
    if (countdown > 0) return;
    setIsVerifying(true);
    
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "SIGNUP" }),
      });
      
      if (res.ok) {
        setCountdown(60);
      } else {
        const data = await res.json();
        setVerifyError(data.error || "Failed to resend code");
      }
    } catch (err) {
      setVerifyError("Something went wrong");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 overflow-y-auto ${theme === 'dark'
      ? 'bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]'
      : 'bg-gradient-to-br from-[#EAEAEA] via-[#FFFFFF] to-[#EAEAEA]'}`}>

      <div className={`w-full max-w-sm p-5 rounded-3xl shadow-xl backdrop-blur-md transition-all border ${theme === 'dark'
        ? 'bg-[#252525]/80 border-[#444]/50 text-white'
        : 'bg-white/90 border-[#DDD]/50 text-[#252525]'}`}>

        <div className="flex flex-col items-center mb-4">
          <img 
            src="/azviq_logo.png" 
            alt="Azviq Logo" 
            className={`w-16 h-16 rounded-xl object-contain mb-2 ${theme === 'dark' ? 'invert' : ''}`} 
          />
          <h1 className={`text-3xl font-bold mb-0.5 tracking-tighter font-[var(--font-lexend)] ${theme === 'dark' ? 'text-white' : 'text-[#252525]'}`}>
            {successMessage ? "Welcome!" : step === 'verify' ? "Check Email" : "Join Azviq"}
          </h1>
          <p className={`text-[11px] text-center opacity-70 px-2 ${theme === 'dark' ? 'text-white' : 'text-[#545454]'}`}>
            {successMessage 
              ? "Taking you to your dashboard..." 
              : step === 'verify' 
                ? `We sent a 6-digit code to ${email}`
                : "Enter details to create account"}
          </p>
        </div>

        {successMessage ? (
          <div className="flex flex-col items-center py-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
              <Check className="w-6 h-6" />
            </div>
            <div className="w-6 h-6 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin mt-2" />
          </div>
        ) : step === 'verify' ? (
          <div className="flex flex-col gap-4 py-2">
            <OtpInput 
              length={6} 
              onComplete={handleVerify} 
              error={!!verifyError} 
              disabled={isVerifying}
            />
            {verifyError && <p className="text-red-500 text-[10px] text-center font-bold">{verifyError}</p>}
            
            <button
              onClick={handleResendCode}
              disabled={countdown > 0 || isVerifying}
              className="text-[10px] mt-4 uppercase font-bold tracking-widest text-center opacity-50 hover:opacity-100 disabled:hover:opacity-50 transition-opacity"
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
            </button>
            <button
              onClick={() => {
                setStep('form');
                setVerifyError("");
              }}
              className="text-[10px] underline uppercase font-bold tracking-widest text-center opacity-50 hover:opacity-100 transition-opacity"
            >
              Change Email
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }}>
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
                    } ${errors.email ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">Create Password</label>
              <PasswordInput
                placeholder="••••••••"
                value={password}
                onChange={setPassword}
                className={`py-2 text-xs ${errors.password ? 'border-red-500 focus:ring-red-500/30' : ''}`}
              />
              {errors.password && <p className="text-[10px] text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">Confirm Password</label>
              <PasswordInput
                placeholder="••••••••"
                value={confirmPassword}
                onChange={setConfirmPassword}
                className={`py-2 text-xs ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500/30' : ''}`}
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2
                ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#252525] text-white hover:bg-[#333]'}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isVerifying ? "Processing..." : "Create Account"}
            </button>

            <div className="relative my-4">
              <div className={`absolute inset-0 flex items-center ${theme === 'dark' ? 'opacity-10' : 'opacity-20'}`}><div className="w-full border-t border-current"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className={`${theme === 'dark' ? 'bg-[#252525] px-2 text-gray-400' : 'bg-white px-2 text-gray-500'}`}>Or continue with</span></div>
            </div>

            <button
              type="button"
              onClick={() => {
                document.cookie = "auth_intent_v2=signup; path=/; max-age=300";
                nextAuthSignIn("google", { 
                  callbackUrl: "/dashboard",
                  prompt: "select_account",
                });
              }}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-2
                ${theme === 'dark'
                  ? 'bg-transparent border-[#444] text-white hover:bg-white/5'
                  : 'bg-white border-[#DDD] text-[#252525] hover:bg-gray-50'}`}
            >
              <Bot className="w-3.5 h-3.5" />
              Sign up with Google
            </button>
          </form>
        )}

        <p className="text-center mt-4 text-[11px] opacity-70">
          Have an account?{" "}
          <Link href="/login" className="font-bold underline cursor-pointer hover:opacity-100 transition-opacity">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
