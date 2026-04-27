"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import PasswordInput from "@/components/PasswordInput";
import { Mail, UserPlus, Check, X, Bot, Camera, Trash2, User } from "lucide-react";
import Link from "next/link";
import { signIn as nextAuthSignIn } from "next-auth/react";
import OtpInput from "@/components/auth/OtpInput";

import { useSession } from "next-auth/react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<'form' | 'verify' | 'onboarding'>('form');
  const [otpCode, setOtpCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Onboarding State
  const [userId, setUserId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    username: "",
    bio: "",
    city: "",
    mobile_no: "",
    pronouns: "",
    avatar_url: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [onboardingErrors, setOnboardingErrors] = useState<{ [key: string]: string }>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (searchParams.get("onboarding") === "true") {
      setStep('onboarding');
      if (status === "authenticated" && session?.user) {
        // @ts-ignore
        setUserId(session.user.id || localStorage.getItem('userId'));
      }
    }
  }, [searchParams, status, session]);

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

      setSuccessMessage("Account verified! Setting up your profile...");

      // Auto-login after successful verification
      const signInResult = await nextAuthSignIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (signInResult?.ok) {
        const userRes = await fetch("/api/auth/get-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const userData = await userRes.json();
        if (userData.user?.id) {
          localStorage.setItem('userId', userData.user.id);
          setUserId(userData.user.id);
          setSuccessMessage("");
          setStep('onboarding');
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        window.location.href = "/login";
      }
    } catch (err) {
      setVerifyError("Something went wrong");
    } finally {
      setIsVerifying(false);
    }
  }

  // Onboarding Handlers
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setProfileForm({ ...profileForm, avatar_url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarRemove = () => {
    setAvatarPreview(null);
    setProfileForm({ ...profileForm, avatar_url: "" });
  };

  const handleCompleteSetup = async () => {
    const newErrors: { [key: string]: string } = {};
    if (!profileForm.name.trim()) newErrors.name = "Required";
    if (!profileForm.username.trim()) newErrors.username = "Required";
    if (!profileForm.mobile_no.trim()) newErrors.mobile_no = "Required";

    if (Object.keys(newErrors).length > 0) {
      setOnboardingErrors(newErrors);
      return;
    }

    if (!userId) return;

    setIsSavingProfile(true);
    setOnboardingErrors({});

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(profileForm),
      });

      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        alert(`Failed to save profile: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert("Something went wrong while saving your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

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
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background text-foreground">

      {/* Left Side - Laptop ONLY (Greeting / Graphic) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-[#f7f3e9] dark:bg-[#161412]">
        {/* Abstract Background Shapes */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px] bg-amber-200/50 dark:bg-amber-900/20" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full blur-[120px] bg-orange-100/50 dark:bg-orange-900/20" />

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
            Start your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B4513] to-[#D2691E]">academic</span> journey.
          </h1>
          <p className="text-lg opacity-70 font-medium max-w-md">
            Join 10+ top-achieving students using Azviq to master their studies with AI power.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex -space-x-3 mb-3">
            <div className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-[#161412] bg-[#8B4513]' : 'border-[#f7f3e9] bg-[#A0522D]'}`} />
            <div className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-[#161412] bg-[#D2691E]' : 'border-[#f7f3e9] bg-[#CD853F]'}`} />
            <div className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-[#161412] bg-[#DEB887]' : 'border-[#f7f3e9] bg-[#F5DEB3]'}`} />
          </div>
          <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
            Join 10+ top achievers
          </p>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">

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

        <div className="w-full max-w-[400px]">
          {step !== 'onboarding' && (
            <div className="mb-8 mt-12 lg:mt-0">
              <h2 className="text-3xl font-bold mb-2 font-[var(--font-lexend)]">
                {successMessage ? "Welcome!" : step === 'verify' ? "Check Email" : "Create an Account"}
              </h2>
              <p className="text-sm opacity-60">
                {successMessage
                  ? "Taking you to your dashboard..."
                  : step === 'verify'
                    ? `We sent a 6-digit code to ${email}`
                    : "Please enter your details to sign up."}
              </p>
            </div>
          )}

          {successMessage ? (
            <div className="flex flex-col items-center py-10">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                <Check className="w-8 h-8" />
              </div>
              <div className="w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mt-2" />
            </div>
          ) : step === 'verify' ? (
            <div className="flex flex-col gap-6 py-4">
              <OtpInput
                length={6}
                onComplete={handleVerify}
                error={!!verifyError}
                disabled={isVerifying}
              />
              {verifyError && <p className="text-red-500 text-xs text-center font-bold">{verifyError}</p>}

              <div className="flex flex-col gap-3 mt-4">
                <button
                  onClick={handleResendCode}
                  disabled={countdown > 0 || isVerifying}
                  className="text-xs uppercase font-bold tracking-widest text-center opacity-70 hover:opacity-100 hover:text-[#8B4513] disabled:hover:opacity-70 transition-all"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
                </button>
                <button
                  onClick={() => {
                    setStep('form');
                    setVerifyError("");
                  }}
                  className="text-xs underline uppercase font-bold tracking-widest text-center opacity-70 hover:opacity-100 hover:text-[#8B4513] transition-all"
                >
                  Change Email
                </button>
              </div>
            </div>
          ) : step === 'onboarding' ? (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center mb-1 mt-6 lg:mt-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-2 ${theme === 'dark' ? 'bg-[#8B4513]/20 text-[#D2691E]' : 'bg-[#8B4513]/10 text-[#8B4513]'}`}>
                  <User className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold mb-1 font-[var(--font-lexend)]">Complete Profile</h2>
                <p className="text-xs opacity-60 text-center">Add details to personalize your experience.</p>
              </div>

              <div className="flex justify-center mb-1">
                <div className="relative">
                  {avatarPreview || profileForm.avatar_url ? (
                    <img
                      src={avatarPreview || profileForm.avatar_url}
                      alt="Avatar"
                      className={`w-16 h-16 rounded-full object-cover border-2 ${theme === 'dark' ? 'border-[#333]' : 'border-gray-200'}`}
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed ${theme === 'dark' ? 'bg-[#1c1c1c] border-[#333]' : 'bg-gray-50 border-gray-300'}`}>
                      <User className={`w-6 h-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  )}

                  <label className={`absolute bottom-0 right-0 p-1.5 rounded-full cursor-pointer shadow-lg transform transition-transform hover:scale-110 ${theme === 'dark' ? 'bg-[#8B4513] text-white' : 'bg-[#8B4513] text-white'}`}>
                    <Camera className="w-3 h-3" />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>

                  {(avatarPreview || profileForm.avatar_url) && (
                    <button
                      onClick={handleAvatarRemove}
                      className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-all shadow-md"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Full Name *</label>
                  <input
                    name="name"
                    placeholder="Your name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all text-xs ${theme === 'dark'
                      ? 'bg-[#1c1c1c] border-[#333] text-white focus:ring-[#8B4513]/50 focus:border-[#8B4513]/50'
                      : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#8B4513]/20 focus:border-[#8B4513]'
                      } ${onboardingErrors.name ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                  />
                  {onboardingErrors.name && <p className="text-red-500 text-[10px] mt-0.5 font-bold">{onboardingErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Username *</label>
                  <input
                    name="username"
                    placeholder="@username"
                    value={profileForm.username}
                    onChange={handleProfileChange}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all text-xs ${theme === 'dark'
                      ? 'bg-[#1c1c1c] border-[#333] text-white focus:ring-[#8B4513]/50 focus:border-[#8B4513]/50'
                      : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#8B4513]/20 focus:border-[#8B4513]'
                      } ${onboardingErrors.username ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                  />
                  {onboardingErrors.username && <p className="text-red-500 text-[10px] mt-0.5 font-bold">{onboardingErrors.username}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Mobile No. *</label>
                  <input
                    name="mobile_no"
                    placeholder="Phone"
                    value={profileForm.mobile_no}
                    onChange={handleProfileChange}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all text-xs ${theme === 'dark'
                      ? 'bg-[#1c1c1c] border-[#333] text-white focus:ring-[#8B4513]/50 focus:border-[#8B4513]/50'
                      : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#8B4513]/20 focus:border-[#8B4513]'
                      } ${onboardingErrors.mobile_no ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                  />
                  {onboardingErrors.mobile_no && <p className="text-red-500 text-[10px] mt-0.5 font-bold">{onboardingErrors.mobile_no}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">City</label>
                  <input
                    name="city"
                    placeholder="Your city"
                    value={profileForm.city}
                    onChange={handleProfileChange}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all text-xs ${theme === 'dark'
                      ? 'bg-[#1c1c1c] border-[#333] text-white focus:ring-[#8B4513]/50 focus:border-[#8B4513]/50'
                      : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#8B4513]/20 focus:border-[#8B4513]'
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Pronouns</label>
                  <select
                    name="pronouns"
                    value={profileForm.pronouns}
                    onChange={handleProfileChange}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all text-xs appearance-none ${theme === 'dark'
                      ? 'bg-[#1c1c1c] border-[#333] text-white focus:ring-[#8B4513]/50 focus:border-[#8B4513]/50'
                      : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#8B4513]/20 focus:border-[#8B4513]'
                      }`}
                  >
                    <option value="">Select</option>
                    <option value="he/him">he/him</option>
                    <option value="she/her">she/her</option>
                    <option value="they/them">they/them</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Bio</label>
                <textarea
                  name="bio"
                  placeholder="Tell us about your academic goals..."
                  value={profileForm.bio}
                  onChange={handleProfileChange}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all resize-none text-xs ${theme === 'dark'
                    ? 'bg-[#1c1c1c] border-[#333] text-white focus:ring-[#8B4513]/50 focus:border-[#8B4513]/50'
                    : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#8B4513]/20 focus:border-[#8B4513]'
                    }`}
                />
              </div>

              <button
                onClick={handleCompleteSetup}
                disabled={isSavingProfile}
                className={`w-full py-3.5 mt-2 rounded-xl font-bold text-sm shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                  ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#1a1a1a] text-white hover:bg-black'}`}
              >
                {isSavingProfile ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isSavingProfile ? "Saving..." : "Complete Setup"}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-5">
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
                      } ${errors.email ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Create Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                  className={`py-3 text-sm rounded-xl ${theme === 'dark' ? 'bg-[#1c1c1c] border-[#333]' : 'bg-white border-gray-200'} ${errors.password ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                />
                {errors.password && <p className="text-xs text-red-500 mt-2 font-medium">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Confirm Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  className={`py-3 text-sm rounded-xl ${theme === 'dark' ? 'bg-[#1c1c1c] border-[#333]' : 'bg-white border-gray-200'} ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className={`w-full py-3.5 mt-2 rounded-xl font-bold text-sm shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                  ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#1a1a1a] text-white hover:bg-black'}`}
              >
                <UserPlus className="w-4 h-4" />
                {isVerifying ? "Processing..." : "Create Account"}
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
                onClick={() => {
                  document.cookie = "auth_intent_v2=signup; path=/; max-age=300";
                  nextAuthSignIn("google", {
                    callbackUrl: "/signup?onboarding=true",
                    prompt: "select_account",
                  });
                }}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2
                  ${theme === 'dark'
                    ? 'bg-transparent border-[#333] text-white hover:bg-white/5'
                    : 'bg-white border-gray-200 text-[#1a1a1a] hover:bg-gray-50 shadow-sm'}`}
              >
                <Bot className="w-4 h-4" />
                Sign up with Google
              </button>
            </form>
          )}

          <p className={`text-center text-sm opacity-70 ${step === 'onboarding' ? 'mt-4' : 'mt-8'}`}>
            Have an account?{" "}
            <Link href="/login" className="font-bold underline cursor-pointer hover:text-[#8B4513] hover:opacity-100 transition-all">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f0f]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
