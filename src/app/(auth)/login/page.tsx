"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import PasswordInput from "@/components/PasswordInput";
import { Mail, LogIn, Bot, ArrowLeft, Loader2, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSession, signIn as nextAuthSignIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import OtpInput from "@/components/auth/OtpInput";
import { useAppDialog } from "@/components/ui/AppDialog";

type AuthView = "LOGIN" | "FORGOT_PASSWORD";
type ForgotStep = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const dialog = useAppDialog();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [view, setView] = useState<AuthView>("LOGIN");
  
  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState<ForgotStep>("EMAIL");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (forgotStep === "OTP" && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [forgotStep, countdown]);

  const handleGoogleSignIn = () => {
    document.cookie = "auth_intent_v2=login; path=/; max-age=300";
    nextAuthSignIn("google", { callbackUrl });
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
        if (result.error === "AccountNotVerified") {
          setEmailError("Account not verified");
          dialog.showAlert("Your email is not verified. Please sign up again with the same email to receive a new verification code.", "warning");
        } else {
          dialog.showAlert("Invalid email or password", "error");
        }
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
          router.push(callbackUrl);
        } else {
          dialog.showAlert("Login failed", "error");
          setLoading(false);
        }
      }
    } catch (err) {
      dialog.showAlert("Something went wrong", "error");
      setLoading(false);
    }
  }

  // Forgot Password Handlers
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotLoading(true);
    setForgotError("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, type: "PASSWORD_RESET" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      
      setForgotStep("OTP");
      setCountdown(60);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setForgotLoading(true);
    setForgotError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, code, type: "PASSWORD_RESET" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setResetToken(data.resetToken);
      setForgotStep("NEW_PASSWORD");
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setForgotError("Password must be at least 8 characters");
      return;
    }

    setForgotLoading(true);
    setForgotError("");

    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");

      setForgotStep("SUCCESS");
      setTimeout(() => setView("LOGIN"), 3000);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#F5F3EF] dark:bg-[#1A1A1A] text-foreground">
      
      {/* Left Side - Laptop ONLY (Greeting / Graphic) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-[#f7f3e9] dark:bg-[#161412]">
        {/* Abstract Background Shapes */}
        <div className={`absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px] ${
          'bg-amber-200/50 dark:bg-amber-900/20'
        }`} />
        <div className={`absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full blur-[120px] ${
          'bg-orange-100/50 dark:bg-orange-900/20'
        }`} />

        <div className="relative z-10 flex items-center gap-2">
          <img 
            src="/azviq_logo.png" 
            alt="Azviq Logo" 
            className={`w-10 h-10 rounded-xl object-contain shadow-sm dark:invert dark:opacity-90`} 
          />
          <span className="font-bold text-2xl tracking-tight font-[var(--font-lexend)]">Azviq</span>
        </div>

        <div className="relative z-10 max-w-lg mt-24 mb-auto">
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight font-[var(--font-lexend)] mb-6 leading-[1.1]">
            Elevate your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C2A27A] to-[#D2B48C]">learning</span> journey.
          </h1>
          <p className="text-lg opacity-70 font-medium max-w-md">
            Unlock your full academic potential with AI-powered study tools, personalized insights, and smarter scheduling.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex -space-x-3 mb-3">
            <div className={`w-8 h-8 rounded-full border-2 border-[#f7f3e9] bg-[#A68A61] dark:border-[#161412] dark:bg-[#C2A27A]`} />
            <div className={`w-8 h-8 rounded-full border-2 border-[#f7f3e9] bg-[#B89C76] dark:border-[#161412] dark:bg-[#D2B48C]`} />
            <div className={`w-8 h-8 rounded-full border-2 border-[#f7f3e9] bg-[#F2E6D5] dark:border-[#161412] dark:bg-[#E0CDAE]`} />
          </div>
          <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
            Empowering students worldwide
          </p>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className="w-full lg:w-1/2 h-full flex items-start justify-center p-6 sm:p-12 relative pt-20 lg:pt-[20vh] overflow-y-auto">
        
        {/* Simple Straight Separator */}
        <div className={`hidden lg:block absolute top-0 left-0 w-px h-full z-10 pointer-events-none ${
          'bg-black/5 dark:bg-white/5'
        }`} />

        {/* Mobile Only Logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <img 
            src="/azviq_logo.png" 
            alt="Azviq Logo" 
            className={`w-10 h-10 rounded-xl object-contain shadow-sm dark:invert dark:opacity-90`} 
          />
          <span className="font-bold text-2xl tracking-tight font-[var(--font-lexend)]">Azviq</span>
        </div>

        <div className="w-full max-w-[25rem]">
          {view === "LOGIN" ? (
            <>
              <div className="mb-6 mt-4 lg:mt-0">
                <h2 className="text-2xl sm:text-3xl font-bold mb-1 font-[var(--font-lexend)]">Welcome Back</h2>
                <p className="text-xs sm:text-sm opacity-60">Please enter your details to sign in.</p>
              </div>

              {searchParams.get("error") && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-medium">
                  {searchParams.get("error") === "AccountExists"
                    ? "Account already exists. Please log in."
                    : searchParams.get("error") === "OAuthAccountNotLinked" || searchParams.get("error") === "AccountNotFound" 
                    ? "Account not found. Please sign up first." 
                    : "An error occurred during sign in."}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4 lg:space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      className={`w-full pl-10 pr-4 py-2.5 lg:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all
                        'ring-[#C2A27A]/50 focus:border-[#C2A27A]/50' : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#C2A27A]/20 focus:border-[#C2A27A]' dark:'bg-[#1c1c1c] dark:border-[#333] dark:text-white dark:focus' ${emailError ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider opacity-70">Password</label>
                    <button 
                      type="button"
                      onClick={() => { setView("FORGOT_PASSWORD"); setForgotStep("EMAIL"); }}
                      className="text-xs font-bold text-[#C2A27A] hover:text-[#D2B48C] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                    className={`py-2.5 lg:py-3 text-sm rounded-xl bg-white border-gray-200 dark:bg-[#1c1c1c] dark:border-[#333]`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 lg:py-3.5 mt-1 rounded-xl font-bold text-sm shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                    bg-[#1a1a1a] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100`}
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? "Logging in..." : "Sign in"}
                </button>

                <div className="relative my-8 flex items-center">
                  <div className={`flex-grow h-px bg-gradient-to-r from-transparent to-black/10 dark:to-white/10`}></div>
                  <span className="mx-4 text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 whitespace-nowrap">
                    Or continue with
                  </span>
                  <div className={`flex-grow h-px bg-gradient-to-l from-transparent to-black/10 dark:to-white/10`}></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 lg:py-3.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2 bg-white border-gray-200 text-[#1a1a1a] hover:bg-gray-50 shadow-sm dark:bg-transparent dark:border-[#333] dark:text-white dark:hover:bg-white/5"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.29.81-.55z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
              </form>

              <p className="text-center mt-6 lg:mt-8 text-sm opacity-70">
                Don't have an account?{" "}
                <Link
                  href={callbackUrl !== "/dashboard" ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup"}
                  className="font-bold underline cursor-pointer hover:text-[#C2A27A] hover:opacity-100 transition-all"
                >
                  Sign up now
                </Link>
              </p>

              <div className="mt-6 flex justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-medium opacity-40 hover:opacity-80 transition-opacity group"
                >
                  <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  What is Azviq?
                </Link>
              </div>
            </>
          ) : (
            <div className="py-4 mt-4 lg:mt-0">
              <button 
                onClick={() => setView("LOGIN")}
                className="flex items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity mb-8"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Login
              </button>

              {forgotStep === "EMAIL" && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-1 font-[var(--font-lexend)]">Forgot Password?</h2>
                    <p className="text-xs sm:text-sm opacity-60 leading-relaxed">
                      Enter your email address and we'll send you a 6-digit code to reset your password.
                    </p>
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value.toLowerCase())}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2
                            'ring-[#C2A27A]/50' : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#C2A27A]/20' dark:'bg-[#1c1c1c] dark:border-[#333] dark:text-white dark:focus'`}
                        />
                      </div>
                    </div>

                    {forgotError && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                        {forgotError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2
                        bg-[#1a1a1a] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100`}
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Code"}
                    </button>
                  </form>
                </>
              )}

              {forgotStep === "OTP" && (
                <div className="flex flex-col items-center">
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 font-[var(--font-lexend)]">Check Email</h2>
                  <p className="text-xs sm:text-sm text-center opacity-60 mb-6 sm:mb-8 leading-relaxed">
                    We've sent a 6-digit code to <span className="font-bold text-[#C2A27A]">{forgotEmail}</span>.
                  </p>

                  <OtpInput 
                    length={6} 
                    onComplete={handleVerifyOtp} 
                    error={!!forgotError}
                    disabled={forgotLoading}
                  />
                  {forgotError && <p className="text-red-500 text-xs font-bold mt-4">{forgotError}</p>}

                  <button
                    onClick={() => handleSendOtp()}
                    disabled={countdown > 0 || forgotLoading}
                    className="text-xs mt-8 uppercase font-bold tracking-widest opacity-50 hover:opacity-100 disabled:opacity-30 transition-opacity"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
                  </button>
                </div>
              )}

              {forgotStep === "NEW_PASSWORD" && (
                <>
                  <div className="mb-8 text-center">
                    <div className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-black/5 dark:bg-white/5`}>
                      <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 font-[var(--font-lexend)]">New Password</h2>
                    <p className="text-sm opacity-60">Choose a secure password for your account.</p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">New Password</label>
                      <PasswordInput
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="••••••••"
                        className="py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Confirm Password</label>
                      <PasswordInput
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="••••••••"
                        className="py-3"
                      />
                    </div>

                    {forgotError && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                        <AlertCircle className="w-4 h-4" />
                        {forgotError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2
                        bg-[#1a1a1a] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100`}
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                    </button>
                  </form>
                </>
              )}

              {forgotStep === "SUCCESS" && (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className={`p-4 rounded-full mb-6 bg-green-500/5 dark:bg-green-500/10`}>
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 font-[var(--font-lexend)]">Updated!</h2>
                  <p className="text-sm opacity-60 mb-8">
                    Your password has been reset successfully. Returning to login...
                  </p>
                  <div className="w-8 h-8 border-2 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f0f]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
