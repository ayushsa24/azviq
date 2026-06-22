"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import PasswordInput from "@/components/PasswordInput";
import { Mail, UserPlus, Check, X, Bot, Camera, Trash2, User, Clock, ShieldAlert, ChevronDown } from "lucide-react";
import Link from "next/link";
import { signIn as nextAuthSignIn } from "next-auth/react";
import OtpInput from "@/components/auth/OtpInput";
import { useAppDialog } from "@/components/ui/AppDialog";

import { useSession } from "next-auth/react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const dialog = useAppDialog();
  // Preserve the callbackUrl through signup → onboarding → redirect
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [onboardingErrors, setOnboardingErrors] = useState<{ [key: string]: string }>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [dailyTargetHours, setDailyTargetHours] = useState("unlimited");
  const [customTargetHours, setCustomTargetHours] = useState("");
  
  // Custom dropdown for Pronouns
  const [isPronounsOpen, setIsPronounsOpen] = useState(false);
  const pronounsRef = useRef<HTMLDivElement>(null);

  // Custom dropdown for Daily Study Target
  const [isDailyTargetOpen, setIsDailyTargetOpen] = useState(false);
  const dailyTargetRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pronounsRef.current && !pronounsRef.current.contains(event.target as Node)) {
        setIsPronounsOpen(false);
      }
      if (dailyTargetRef.current && !dailyTargetRef.current.contains(event.target as Node)) {
        setIsDailyTargetOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchParams.get("onboarding") === "true") {
      setStep('onboarding');
      if (status === "authenticated" && session?.user) {
        // @ts-ignore
        setUserId(session.user.id || localStorage.getItem('userId'));
        
        // Pre-fill Google data if available
        setProfileForm(prev => ({
          ...prev,
          name: prev.name || session.user?.name || "",
          avatar_url: prev.avatar_url || session.user?.image || "",
        }));
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
        dialog.showAlert(data.error?.message || "Signup failed", "error");
      }
    } catch (err) {
      dialog.showAlert("Something went wrong", "error");
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

      if (data.userId) {
        localStorage.setItem('userId', data.userId);
        setUserId(data.userId);
      }

      // Auto-login after successful verification
      const signInResult = await nextAuthSignIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (signInResult?.ok) {
        if (data.userId) {
          setSuccessMessage("");
          setStep('onboarding');
        } else {
          // Fallback if userId was not returned
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
            window.location.href = callbackUrl;
          }
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
        dialog.showAlert("Image size should be less than 2MB", "warning");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarRemove = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setProfileForm({ ...profileForm, avatar_url: "" });
  };

  const handleCompleteSetup = async () => {
    const newErrors: { [key: string]: string } = {};
    if (!profileForm.name.trim()) newErrors.name = "Required";
    if (!profileForm.username.trim()) newErrors.username = "Required";
    if (!profileForm.mobile_no.trim()) newErrors.mobile_no = "Required";

    // Daily Study Target is required
    if (dailyTargetHours === "unlimited") {
      newErrors.dailyTarget = "Please select a study goal";
    } else if (dailyTargetHours === "custom") {
      const parsed = parseFloat(customTargetHours);
      if (!customTargetHours || isNaN(parsed) || parsed <= 0 || parsed > 24) {
        newErrors.dailyTarget = "Enter a valid number of hours (0.5 – 24)";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setOnboardingErrors(newErrors);
      return;
    }

    if (!userId) return;

    setIsSavingProfile(true);
    setOnboardingErrors({});

    try {
      let finalAvatarUrl = profileForm.avatar_url;
      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const upRes = await fetch("/api/upload-avatar", {
          method: "POST",
          headers: { "x-user-id": userId },
          body: fd
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          finalAvatarUrl = upData.url;
        } else {
          dialog.showAlert("Failed to upload profile picture", "error");
          setIsSavingProfile(false);
          return;
        }
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ ...profileForm, avatar_url: finalAvatarUrl }),
      });

      if (res.ok) {
        try {
          await fetch("/api/parent-control", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              daily_target_hours: dailyTargetHours === "unlimited"
                ? null
                : dailyTargetHours === "custom"
                  ? (parseFloat(customTargetHours) || 0)
                  : parseFloat(dailyTargetHours),
              control_enabled: dailyTargetHours !== "unlimited",
            }),
          });
        } catch (pcErr) {
          console.error("Failed to save parent controls settings:", pcErr);
        }
        window.location.href = callbackUrl;
      } else {
        const data = await res.json();
        dialog.showAlert(`Failed to save profile: ${data.error || 'Unknown error'}`, "error");
      }
    } catch (err) {
      dialog.showAlert("Something went wrong while saving your profile.", "error");
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
    <div className="h-full flex flex-col lg:flex-row bg-background text-foreground">

      {/* Left Side - Laptop ONLY (Greeting / Graphic) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-[#f7f3e9] dark:bg-[#161412]">
        {/* Abstract Background Shapes */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px] bg-amber-200/50 dark:bg-amber-900/20" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full blur-[120px] bg-orange-100/50 dark:bg-orange-900/20" />

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
            Start your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C2A27A] to-[#D2B48C]">academic</span> journey.
          </h1>
          <p className="text-lg opacity-70 font-medium max-w-md">
            Join 10+ top-achieving students using Azviq to master their studies with AI power.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex -space-x-3 mb-3">
            <div className={`w-8 h-8 rounded-full border-2 border-[#f7f3e9] bg-[#A68A61] dark:border-[#161412] dark:bg-[#C2A27A]`} />
            <div className={`w-8 h-8 rounded-full border-2 border-[#f7f3e9] bg-[#B89C76] dark:border-[#161412] dark:bg-[#D2B48C]`} />
            <div className={`w-8 h-8 rounded-full border-2 border-[#f7f3e9] bg-[#F2E6D5] dark:border-[#161412] dark:bg-[#E0CDAE]`} />
          </div>
          <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
            Join 10+ top achievers
          </p>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className={`w-full lg:w-1/2 h-full flex items-start justify-center p-6 sm:p-12 relative ${step === 'onboarding' ? 'pt-20 lg:pt-[10vh]' : 'pt-20 lg:pt-[20vh]'} overflow-y-auto`}>

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
          {step !== 'onboarding' && (
            <div className="mb-6 mt-4 lg:mt-0">
              <h2 className="text-2xl sm:text-3xl font-bold mb-1 font-[var(--font-lexend)]">
                {successMessage ? "Welcome!" : step === 'verify' ? "Check Email" : "Create an Account"}
              </h2>
              <p className="text-xs sm:text-sm opacity-60">
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
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400`}>
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
                  className="text-xs uppercase font-bold tracking-widest text-center opacity-70 hover:opacity-100 hover:text-[#C2A27A] disabled:hover:opacity-70 transition-all"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
                </button>
                <button
                  onClick={() => {
                    setStep('form');
                    setVerifyError("");
                  }}
                  className="text-xs underline uppercase font-bold tracking-widest text-center opacity-70 hover:opacity-100 hover:text-[#C2A27A] transition-all"
                >
                  Change Email
                </button>
              </div>
            </div>
          ) : step === 'onboarding' ? (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center mb-1 mt-1 lg:mt-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-2 bg-[#C2A27A]/10 text-[#C2A27A] dark:bg-[#C2A27A]/20 dark:text-[#D2B48C]`}>
                  <User className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-1 font-[var(--font-lexend)]">Complete Profile</h2>
                <p className="text-[10px] sm:text-xs opacity-60 text-center">Add details to personalize your experience.</p>
              </div>

              <div className="flex justify-center mb-1">
                <div className="relative">
                  {avatarPreview || profileForm.avatar_url ? (
                    <img
                      src={avatarPreview || profileForm.avatar_url}
                      alt="Avatar"
                      className={`w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-[#333]`}
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed bg-gray-50 border-gray-300 dark:bg-[#1c1c1c] dark:border-[#333]`}>
                      <User className={`w-6 h-6 text-gray-400 dark:text-gray-500`} />
                    </div>
                  )}

                  <label className={`absolute bottom-0 right-0 p-1.5 rounded-full cursor-pointer shadow-lg transform transition-transform hover:scale-110 bg-[#C2A27A] text-white dark:bg-[#C2A27A] dark:text-white`}>
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

              {/* ── Form Fields ── */}
              <div className="space-y-3">

                 {/* Username */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#7D7D7D] dark:text-[#BABABA]">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="username"
                    placeholder="@handle"
                    value={profileForm.username}
                    onChange={handleProfileChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all
                      bg-white dark:bg-[#1c1c1c]
                      text-[#1a1a1a] dark:text-white
                      placeholder-[#BABABA] dark:placeholder-[#545454]
                      ${onboardingErrors.username
                        ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400/25'
                        : 'border-[#E8E5E0] dark:border-[#2e2e2e] focus:border-[#C2A27A] focus:ring-2 focus:ring-[#C2A27A]/20'
                      }`}
                  />
                  {onboardingErrors.username && <p className="text-red-500 text-[10px] mt-1 font-medium">{onboardingErrors.username}</p>}
                </div>

                {/* Full Name + Mobile */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#7D7D7D] dark:text-[#BABABA]">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      placeholder="Your full name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all
                        bg-white dark:bg-[#1c1c1c]
                        text-[#1a1a1a] dark:text-white
                        placeholder-[#BABABA] dark:placeholder-[#545454]
                        ${onboardingErrors.name
                          ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400/25'
                          : 'border-[#E8E5E0] dark:border-[#2e2e2e] focus:border-[#C2A27A] focus:ring-2 focus:ring-[#C2A27A]/20'
                        }`}
                    />
                    {onboardingErrors.name && <p className="text-red-500 text-[10px] mt-1 font-medium">{onboardingErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#7D7D7D] dark:text-[#BABABA]">
                      Mobile No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="mobile_no"
                      placeholder="+91 00000 00000"
                      value={profileForm.mobile_no}
                      onChange={handleProfileChange}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all
                        bg-white dark:bg-[#1c1c1c]
                        text-[#1a1a1a] dark:text-white
                        placeholder-[#BABABA] dark:placeholder-[#545454]
                        ${onboardingErrors.mobile_no
                          ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400/25'
                          : 'border-[#E8E5E0] dark:border-[#2e2e2e] focus:border-[#C2A27A] focus:ring-2 focus:ring-[#C2A27A]/20'
                        }`}
                    />
                    {onboardingErrors.mobile_no && <p className="text-red-500 text-[10px] mt-1 font-medium">{onboardingErrors.mobile_no}</p>}
                  </div>
                </div>

                {/* City + Pronouns */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#7D7D7D] dark:text-[#BABABA]">City</label>
                    <input
                      name="city"
                      placeholder="Your city"
                      value={profileForm.city}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all
                        bg-white dark:bg-[#1c1c1c]
                        text-[#1a1a1a] dark:text-white
                        placeholder-[#BABABA] dark:placeholder-[#545454]
                        border-[#E8E5E0] dark:border-[#2e2e2e]
                        focus:border-[#C2A27A] focus:ring-2 focus:ring-[#C2A27A]/20"
                    />
                  </div>

                  <div className="relative" ref={pronounsRef}>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#7D7D7D] dark:text-[#BABABA]">Pronouns</label>
                    <button
                      type="button"
                      onClick={() => setIsPronounsOpen(!isPronounsOpen)}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all flex items-center justify-between text-left
                        bg-white dark:bg-[#1c1c1c]
                        text-[#1a1a1a] dark:text-white
                        border-[#E8E5E0] dark:border-[#2e2e2e]
                        focus:border-[#C2A27A] focus:ring-2 focus:ring-[#C2A27A]/20"
                    >
                      <span className={profileForm.pronouns ? "text-[#1a1a1a] dark:text-white" : "text-[#BABABA] dark:text-[#545454]"}>
                        {profileForm.pronouns || "Select Pronouns"}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#7D7D7D] transition-transform duration-200 ${isPronounsOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isPronounsOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 dark:bg-[#1c1c1c]/95 backdrop-blur-md border border-[#E8E5E0] dark:border-[#2e2e2e] rounded-2xl shadow-xl z-[100] p-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        {[
                          { value: "", label: "Select Pronouns" },
                          { value: "he/him", label: "he/him" },
                          { value: "she/her", label: "she/her" },
                          { value: "they/them", label: "they/them" }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setProfileForm(prev => ({ ...prev, pronouns: opt.value }));
                              setIsPronounsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                              profileForm.pronouns === opt.value
                                ? "bg-[#C2A27A]/10 dark:bg-[#C2A27A]/20 text-[#C2A27A]"
                                : "text-[#545454] dark:text-[#BABABA] hover:bg-[#F0EDE8] dark:hover:bg-[#333] hover:text-[#252525] dark:hover:text-white"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {profileForm.pronouns === opt.value && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Daily Study Target */}
                <div ref={dailyTargetRef}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3 text-[#7D7D7D] dark:text-[#BABABA]" />
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#7D7D7D] dark:text-[#BABABA]">
                      Daily Study Target <span className="text-red-500">*</span>
                    </label>
                  </div>

                  {dailyTargetHours !== "custom" ? (
                    <div className="relative">
                      {/* Trigger button */}
                      <button
                        type="button"
                        onClick={() => setIsDailyTargetOpen(!isDailyTargetOpen)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all flex items-center justify-between text-left
                          bg-white dark:bg-[#1c1c1c]
                          text-[#1a1a1a] dark:text-white
                          ${onboardingErrors.dailyTarget
                            ? 'border-red-400 dark:border-red-500'
                            : 'border-[#E8E5E0] dark:border-[#2e2e2e] focus:border-[#C2A27A] focus:ring-2 focus:ring-[#C2A27A]/20'
                          }`}
                      >
                        <span className={dailyTargetHours === "unlimited" ? "text-[#BABABA] dark:text-[#545454]" : "text-[#1a1a1a] dark:text-white"}>
                          {dailyTargetHours === "unlimited" ? "No target set" :
                           dailyTargetHours === "1" ? "1 hrs/day" :
                           dailyTargetHours === "2" ? "2 hrs/day" :
                           dailyTargetHours === "4" ? "4 hrs/day" :
                           dailyTargetHours === "6" ? "6 hrs/day" :
                           dailyTargetHours === "8" ? "8 hrs/day" : "No target set"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-[#7D7D7D] transition-transform duration-200 ${isDailyTargetOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Floating dropdown panel */}
                      {isDailyTargetOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 dark:bg-[#1c1c1c]/95 backdrop-blur-md border border-[#E8E5E0] dark:border-[#2e2e2e] rounded-2xl shadow-xl z-[100] p-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                          {[
                            { value: "1", label: "1 hrs/day" },
                            { value: "2", label: "2 hrs/day" },
                            { value: "4", label: "4 hrs/day" },
                            { value: "6", label: "6 hrs/day" },
                            { value: "8", label: "8 hrs/day" },
                            { value: "custom", label: "Custom Goal..." },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setDailyTargetHours(opt.value);
                                setIsDailyTargetOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                                dailyTargetHours === opt.value
                                  ? "bg-[#C2A27A]/10 dark:bg-[#C2A27A]/20 text-[#C2A27A]"
                                  : "text-[#545454] dark:text-[#BABABA] hover:bg-[#F0EDE8] dark:hover:bg-[#333] hover:text-[#252525] dark:hover:text-white"
                              }`}
                            >
                              <span>{opt.label}</span>
                              {dailyTargetHours === opt.value && <Check className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-stretch gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={customTargetHours}
                          onChange={(e) => setCustomTargetHours(e.target.value)}
                          placeholder="e.g. 2.5"
                          className={`w-full px-3.5 py-2.5 pr-16 rounded-xl border text-sm outline-none transition-all
                            bg-white dark:bg-[#1c1c1c]
                            text-[#1a1a1a] dark:text-white
                            placeholder-[#BABABA] dark:placeholder-[#545454]
                            ${onboardingErrors.dailyTarget
                              ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400/25'
                              : 'border-[#E8E5E0] dark:border-[#2e2e2e] focus:border-[#C2A27A] focus:ring-2 focus:ring-[#C2A27A]/20'
                            }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#BABABA] pointer-events-none">hrs/day</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setDailyTargetHours("unlimited"); setCustomTargetHours(""); }}
                        className="flex-shrink-0 px-3 py-2 rounded-xl border text-sm transition-all active:scale-95
                          bg-black/5 border-[#E8E5E0] text-[#7D7D7D] hover:text-[#1a1a1a] hover:bg-black/10
                          dark:bg-white/5 dark:border-[#2e2e2e] dark:text-[#BABABA] dark:hover:text-white dark:hover:bg-white/10"
                        title="Reset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {onboardingErrors.dailyTarget && (
                    <p className="text-red-500 text-[10px] mt-1 font-medium">{onboardingErrors.dailyTarget}</p>
                  )}

                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ShieldAlert className="w-3 h-3 text-[#C2A27A] flex-shrink-0" />
                    <p className="text-[10px] text-[#BABABA] dark:text-[#545454] leading-tight">
                      Tracked in Study Consistency. Change anytime in{" "}
                      <span className="font-semibold text-[#C2A27A]">Settings → Parental Control</span>.
                    </p>
                  </div>
                </div>


              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#7D7D7D] dark:text-[#BABABA]">Bio</label>
                <textarea
                  name="bio"
                  placeholder="Tell us about your academic goals..."
                  value={profileForm.bio}
                  onChange={handleProfileChange}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all resize-none
                    bg-white dark:bg-[#1c1c1c]
                    text-[#1a1a1a] dark:text-white
                    placeholder-[#BABABA] dark:placeholder-[#545454]
                    border-[#E8E5E0] dark:border-[#2e2e2e]
                    focus:border-[#C2A27A] focus:ring-2 focus:ring-[#C2A27A]/20"
                />
              </div>{/* end Bio */}
              </div>{/* end space-y-3 */}

              <button
                onClick={handleCompleteSetup}
                disabled={isSavingProfile}
                className={`w-full py-3 lg:py-3.5 mt-1 rounded-xl font-bold text-sm shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                  bg-[#1a1a1a] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100`}
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
            <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-4 lg:space-y-5">
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
                      'ring-[#C2A27A]/50 focus:border-[#C2A27A]/50' : 'bg-white border-gray-200 text-[#1a1a1a] focus:ring-[#C2A27A]/20 focus:border-[#C2A27A]' dark:'bg-[#1c1c1c] dark:border-[#333] dark:text-white dark:focus' ${errors.email ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Create Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                  className={`py-2.5 lg:py-3 text-sm rounded-xl bg-white border-gray-200 dark:bg-[#1c1c1c] dark:border-[#333] ${errors.password ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                />
                {errors.password && <p className="text-xs text-red-500 mt-2 font-medium">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">Confirm Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  className={`py-2.5 lg:py-3 text-sm rounded-xl bg-white border-gray-200 dark:bg-[#1c1c1c] dark:border-[#333] ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className={`w-full py-3 lg:py-3.5 mt-1 rounded-xl font-bold text-sm shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
                  bg-[#1a1a1a] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100`}
              >
                <UserPlus className="w-4 h-4" />
                {isVerifying ? "Processing..." : "Create Account"}
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
                onClick={() => {
                  document.cookie = "auth_intent_v2=signup; path=/; max-age=300";
                  nextAuthSignIn("google", {
                    callbackUrl: "/signup?onboarding=true",
                    prompt: "select_account",
                  });
                }}
                className="w-full py-3 lg:py-3.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2 bg-white border-gray-200 text-[#1a1a1a] hover:bg-gray-50 shadow-sm dark:bg-transparent dark:border-[#333] dark:text-white dark:hover:bg-white/5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.29.81-.55z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign up with Google
              </button>
            </form>
          )}

          <p className={`text-center text-sm opacity-70 ${step === 'onboarding' ? 'mt-3' : 'mt-6 lg:mt-8'}`}>
            Have an account?{" "}
            <Link
              href={callbackUrl !== "/dashboard" ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
              className="font-bold underline cursor-pointer hover:text-[#C2A27A] hover:opacity-100 transition-all"
            >
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
