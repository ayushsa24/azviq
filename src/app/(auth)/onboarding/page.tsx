"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { User, LogIn, Camera, Upload, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    city: "",
    mobile_no: "",
    pronouns: "",
    avatar_url: "",
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // 🔹 Get user ID from localStorage (set during signup)
  //   const {
  //   data: { user },
  // } = await supabase.auth.getUser();

// const userId = user?.id;

  // FETCH PROFILE
  useEffect(() => {
    // Get userId from localStorage
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      // If no userId found, redirect to signup
      router.push('/signup');
      return;
    }
    
    setUserId(storedUserId);

    async function fetchProfile() {
      const res = await fetch("/api/profile", {
        headers: { "x-user-id": storedUserId as string },
      });

      const data = await res.json();
      if (data) setForm(data);
      setLoading(false);
    }

    fetchProfile();
  }, []);

  // HANDLE CHANGE
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // HANDLE AVATAR UPLOAD
  const handleAvatarChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setForm({ ...form, avatar_url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  // HANDLE AVATAR REMOVE
  const handleAvatarRemove = () => {
    setAvatarPreview(null);
    setForm({ ...form, avatar_url: "" });
  };

  // SAVE PROFILE AND LOGIN TO DASHBOARD
  const handleLogin = async () => {
    if (!userId) {
      alert("User session not found. Please sign up again.");
      router.push('/signup');
      return;
    }

    // First save the profile to Supabase
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        // Profile saved successfully, now redirect to dashboard
        router.push("/dashboard");
      } else {
        alert(`Failed to save profile: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert("Something went wrong while saving your profile.");
      console.error("Profile save error:", err);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className={`min-h-screen flex items-center justify-center transition-all duration-300 p-4 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-[#252525] via-[#545454]/20 to-[#252525]' 
        : 'bg-gradient-to-br from-[#CFCFCF] via-[#7D7D7D]/20 to-[#CFCFCF]'
    }`}>
      
      <div className={`w-full max-w-md p-4 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 border ${
        theme === 'dark' 
          ? 'bg-[#252525]/60 border-[#545454]/50' 
          : 'bg-white/90 border-[#7D7D7D]/50'
      }`}>

        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-2 transition-all duration-300 ${
            theme === 'dark' ? 'bg-[#7D7D7D] text-white' : 'bg-[#545454] text-white'
          }`}>
            <User className="w-5 h-5" />
          </div>
          <h1 className={`text-xl font-bold mb-1 transition-colors ${
            theme === 'dark' ? 'text-white' : 'text-[#252525]'
          }`}>
            Complete Profile
          </h1>
          <p className={`text-xs text-center transition-colors ${
            theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
          }`}>
            Add details to continue
          </p>
        </div>

        {/* AVATAR UPLOAD */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            {avatarPreview || form.avatar_url ? (
              <img
                src={avatarPreview || form.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-3 border-[#7D7D7D]"
              />
            ) : (
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border-3 ${
                theme === 'dark' 
                  ? 'bg-[#545454] border-[#7D7D7D]' 
                  : 'bg-[#CFCFCF] border-[#7D7D7D]'
              }`}>
                <User className="w-8 h-8 text-[#7D7D7D]" />
              </div>
            )}
            
            {/* Camera Icon - Bottom Right */}
            <label className={`absolute bottom-0 right-0 p-1.5 rounded-full cursor-pointer ${
              theme === 'dark' ? 'bg-[#7D7D7D]' : 'bg-[#545454]'
            } text-white`}>
              <Camera className="w-3 h-3" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
            
            {/* Remove Icon - Above Camera */}
            {(avatarPreview || form.avatar_url) && (
              <div className="absolute bottom-8 right-0 transform translate-x-1">
                <button
                  onClick={handleAvatarRemove}
                  className="bg-red-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-red-700 transition-colors duration-200 shadow-lg border border-white"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* FORM FIELDS IN GRID */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* NAME */}
          <div className="col-span-2">
            <label className={`block text-xs font-medium mb-1 transition-colors ${
              theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
            }`}>
              Name
            </label>
            <input
              name="name"
              placeholder="Your name"
              value={form.name || ""}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all duration-200 ${
                theme === 'dark' 
                  ? 'bg-[#545454]/50 border-[#7D7D7D] text-white placeholder-[#CFCFCF] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#545454]/70' 
                  : 'bg-white border-[#7D7D7D] text-[#252525] placeholder-[#545454] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#CFCFCF]/50'
              }`}
            />
          </div>

          {/* USERNAME */}
          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors ${
              theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
            }`}>
              Username
            </label>
            <input
              name="username"
              placeholder="@username"
              value={form.username || ""}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all duration-200 ${
                theme === 'dark' 
                  ? 'bg-[#545454]/50 border-[#7D7D7D] text-white placeholder-[#CFCFCF] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#545454]/70' 
                  : 'bg-white border-[#7D7D7D] text-[#252525] placeholder-[#545454] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#CFCFCF]/50'
              }`}
            />
          </div>

          {/* CITY */}
          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors ${
              theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
            }`}>
              City
            </label>
            <input
              name="city"
              placeholder="Your city"
              value={form.city || ""}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all duration-200 ${
                theme === 'dark' 
                  ? 'bg-[#545454]/50 border-[#7D7D7D] text-white placeholder-[#CFCFCF] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#545454]/70' 
                  : 'bg-white border-[#7D7D7D] text-[#252525] placeholder-[#545454] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#CFCFCF]/50'
              }`}
            />
          </div>

          {/* MOBILE */}
          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors ${
              theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
            }`}>
              Mobile
            </label>
            <input
              name="mobile_no"
              placeholder="Mobile number"
              value={form.mobile_no || ""}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all duration-200 ${
                theme === 'dark' 
                  ? 'bg-[#545454]/50 border-[#7D7D7D] text-white placeholder-[#CFCFCF] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#545454]/70' 
                  : 'bg-white border-[#7D7D7D] text-[#252525] placeholder-[#545454] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#CFCFCF]/50'
              }`}
            />
          </div>

          {/* PRONOUNS */}
          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors ${
              theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
            }`}>
              Pronouns
            </label>
            <select
              name="pronouns"
              value={form.pronouns || ""}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all duration-200 ${
                theme === 'dark' 
                  ? 'bg-[#545454]/50 border-[#7D7D7D] text-white focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#545454]/70' 
                  : 'bg-white border-[#7D7D7D] text-[#252525] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#CFCFCF]/50'
              }`}
            >
              <option value="">Select</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
            </select>
          </div>
        </div>

        {/* BIO */}
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-1 transition-colors ${
            theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#545454]'
          }`}>
            Bio
          </label>
          <textarea
            name="bio"
            placeholder="Tell us about yourself"
            value={form.bio || ""}
            onChange={handleChange}
            rows={2}
            className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all duration-200 ${
              theme === 'dark' 
                ? 'bg-[#545454]/50 border-[#7D7D7D] text-white placeholder-[#CFCFCF] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#545454]/70' 
                : 'bg-white border-[#7D7D7D] text-[#252525] placeholder-[#545454] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#CFCFCF]/50'
            }`}
          />
        </div>

        {/* LOGIN BUTTON */}
        <button
          onClick={handleLogin}
          className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm ${
            theme === 'dark'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <LogIn className="w-4 h-4" />
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}
