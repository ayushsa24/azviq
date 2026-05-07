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
          window.location.href = callbackUrl;
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
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-[#F5F3EF] dark:bg-[#1A1A1A] text-foreground">
      
      {/* Left Side - Laptop ONLY (Greeting / Graphic) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-[#f7f3e9] dark:bg-[#161412]">
        {/* Abstract Background Shapes */}
        <div className={`absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px] ${
          theme === 'dark' ? 'bg-amber-900/20' : 'bg-amber-200/50'
        }`} />
        <div className={`absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full blur-[120px] ${
          theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-100/50'
        }`} />

        <div className="relative z-10 flex items-center gap-2">
          <img 
            src="/azviq_logo.png" 
            alt="Azviq Logo" 
            className={`w-10 h-10 rounded-xl object-contain shadow-sm ${theme === 'dark' ? 'invert opacity-90' : ''}`} 
          />
          <span className="font-bold text-2xl tracking-tight font-[var(--font-lexend)]">Azviq</span>
        </div>

        <div className="relative z-10 max-w-lg mt-24 mb-auto">
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight font-[var(--font-lexend)] mb-6 leading-[1.1]">
            Elevate your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B4513] to-[#D2691E]">learning</span> journey.
          </h1>
          <p className="text-lg opacity-70 font-medium max-w-md">
            Unlock your full academic potential with AI-powered study tools, personalized insights, and smarter scheduling.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex -space-x-3 mb-3">
            <div className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-[#161412] bg-[#8B4513]' : 'border-[#f7f3e9] bg-[#A0522D]'}`} />
            <div className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-[#161412] bg-[#D2691E]' : 'border-[#f7f3e9] bg-[#CD853F]'}`} />
            <div className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-[#161412] bg-[#DEB887]' : 'border-[#f7f3e9] bg-[#F5DEB3]'}`} />
          </div>
          <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
            Empowering students worldwide
          </p>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className="w-full lg:w-1/2 flex items-start justify-center p-6 sm:p-12 relative pt-24 lg:pt-32">
        
        {/* Simple Straight Separator */}
        <div className={`hidden lg:block absolute top-0 left-0 w-px h-full z-10 pointer-events-none ${
          theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
        }`} />

        {/* Mobile Only Logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <img 
            src="/azviq_logo.png" 
            alt="Azviq Logo" 
            className={`w-8 h-8 rounded-lg object-contain ${theme === 'dark' ? 'invert' : ''}`} 
          />
          <span className="font-bold text-xl tracking-tight font-[var(--font-lexend)]">Azviq</span>
        </div>

        <div className="w-full max-w-[25rem]">
          {view === "LOGIN" ? (
            <>
              <div className="mb-8 mt-12 lg:mt-0">
                <h2 className="text-3xl font-bold mb-2 font-[var(--font-lexend)]">Welcome Back</h2>
                <p className="text-sm opacity-60">Please enter your details to sign in.</p>
              </div>

              {searchParams.get("error") && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-medium">
                  {searchParams.get("error") === "OAuthAccountNotLinked" || searchParams.get("error") === "AccountNotFound" 
                    ? "Account not found. Please sign up first." 
                    : "An error occurred during sign in."}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all
                        ${theme === 'dark'
                          ? 'bg-[#1c1c1c] border-[#333] text-white focus:ring-[#8B4513]/50 focus:border-[#8B4513]/50'
                          : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#8B4513]/20 focus:border-[#8B4513]'
                        } ${emailError ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider opacity-70">Password</label>
                    <button 
                      type="button"
                      onClick={() => { setView("FORGOT_PASSWORD"); setForgotStep("EMAIL"); }}
                      className="text-xs font-bold text-[#8B4513] hover:text-[#D2691E] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                    className={`py-3 text-sm rounded-xl ${theme === 'dark' ? 'bg-[#1c1c1c] border-[#333]' : 'bg-white border-gray-200'}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 mt-2 rounded-xl font-bold text-sm shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                    ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#1a1a1a] text-white hover:bg-black'}`}
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? "Logging in..." : "Sign in"}
                </button>

                <div className="relative my-6">
                  <div className={`absolute inset-0 flex items-center ${theme === 'dark' ? 'opacity-10' : 'opacity-20'}`}>
                    <div className="w-full border-t border-current"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                    <span className={`${theme === 'dark' ? 'bg-[#0f0f0f] px-3 text-gray-500' : 'bg-white px-3 text-gray-400'}`}>
                      Or continue with
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2
                    ${theme === 'dark'
                      ? 'bg-transparent border-[#333] text-white hover:bg-white/5'
                      : 'bg-white border-gray-200 text-[#1a1a1a] hover:bg-gray-50 shadow-sm'}`}
                >
                  <img 
                    src={theme === "dark" ? "/icon-dark.png" : "/icon-light.png"} 
                    alt="AI" 
                    className="w-4 h-4 object-contain" 
                  />
                  Sign in with Google
                </button>
              </form>

              <p className="text-center mt-8 text-sm opacity-70">
                Don't have an account?{" "}
                <Link href="/signup" className="font-bold underline cursor-pointer hover:text-[#8B4513] hover:opacity-100 transition-all">
                  Sign up now
                </Link>
              </p>
            </>
          ) : (
            <div className="py-4">
              <button 
                onClick={() => setView("LOGIN")}
                className="flex items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity mb-8"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Login
              </button>

              {forgotStep === "EMAIL" && (
                <>
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2 font-[var(--font-lexend)]">Forgot Password?</h2>
                    <p className="text-sm opacity-60 leading-relaxed">
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
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2
                            ${theme === 'dark'
                              ? 'bg-[#1c1c1c] border-[#333] text-white focus:ring-[#8B4513]/50'
                              : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#8B4513]/20'}`}
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
                        ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#1a1a1a] text-white hover:bg-black'}`}
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Code"}
                    </button>
                  </form>
                </>
              )}

              {forgotStep === "OTP" && (
                <div className="flex flex-col items-center">
                  <h2 className="text-2xl font-bold mb-2 font-[var(--font-lexend)]">Check Email</h2>
                  <p className="text-sm text-center opacity-60 mb-8 leading-relaxed">
                    We've sent a 6-digit code to <span className="font-bold text-[#8B4513]">{forgotEmail}</span>.
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
                    <div className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
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
                        ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#1a1a1a] text-white hover:bg-black'}`}
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                    </button>
                  </form>
                </>
              )}

              {forgotStep === "SUCCESS" && (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className={`p-4 rounded-full mb-6 ${theme === 'dark' ? 'bg-green-500/10' : 'bg-green-500/5'}`}>
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
