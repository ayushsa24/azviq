"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useSession } from "next-auth/react";
import { User, LogIn, Camera, Upload, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { data: session } = useSession();
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

  // FETCH PROFILE
  useEffect(() => {
    // Priority: Session ID (for Google), then localStorage (for manual)
    // @ts-ignore
    const currentUserId = session?.user?.id || localStorage.getItem('userId');
    
    if (session === null && !localStorage.getItem('userId')) {
      router.push('/signup');
      return;
    }
    
    if (currentUserId) {
      setUserId(currentUserId);
      
      const fetchProfile = async () => {
        try {
          const res = await fetch("/api/profile", {
            headers: { "x-user-id": currentUserId },
          });

          if (res.ok) {
            const data = await res.json();
            if (data) setForm(prev => ({ ...prev, ...data }));
          }
        } catch (error) {
          console.error("Fetch profile error:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    } else if (session !== undefined) {
      // If session is loaded but no ID found yet (might happen on slow loads)
      setLoading(false);
    }
  }, [session]);

  // HANDLE CHANGE
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // HANDLE AVATAR UPLOAD
  const handleAvatarChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
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
        // Profile saved successfully, force reload to refresh session status
        window.location.href = "/dashboard";
      } else {
        alert(`Failed to save profile: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert("Something went wrong while saving your profile.");
      console.error("Profile save error:", err);
    }
  };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#161514] text-white' : 'bg-[#F5F3EF] text-[#252525]'}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
        <span className="text-sm font-medium opacity-70">Loading profile...</span>
      </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 flex items-center justify-center transition-all duration-300 p-4 overflow-y-auto ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-[#252525] via-[#545454]/20 to-[#252525]' 
        : 'bg-gradient-to-br from-[#CFCFCF] via-[#7D7D7D]/20 to-[#CFCFCF]'
    }`}>
      
      <div className={`w-full max-w-sm p-5 rounded-3xl shadow-2xl backdrop-blur-xl transition-all duration-300 border ${
        theme === 'dark' 
          ? 'bg-[#252525]/60 border-[#545454]/50' 
          : 'bg-white/90 border-[#7D7D7D]/50'
      }`}>

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

        <div className="flex justify-center mb-4">
          <div className="relative">
            {avatarPreview || form.avatar_url ? (
              <img
                src={avatarPreview || form.avatar_url}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-[#7D7D7D]/30"
              />
            ) : (
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed ${
                theme === 'dark' 
                  ? 'bg-[#545454]/50 border-[#7D7D7D]/50' 
                  : 'bg-gray-100 border-[#7D7D7D]/50'
              }`}>
                <User className="w-6 h-6 text-[#7D7D7D]" />
              </div>
            )}
            
            <label className={`absolute bottom-0 right-0 p-1 rounded-full cursor-pointer shadow-lg transform transition-transform hover:scale-110 ${
              theme === 'dark' ? 'bg-[#7D7D7D] text-white hover:bg-[#8D8D8D]' : 'bg-[#545454] text-white hover:bg-[#646464]'
            }`}>
              <Camera className="w-3 h-3" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
            
            {(avatarPreview || form.avatar_url) && (
              <button
                onClick={handleAvatarRemove}
                className="absolute -top-0.5 -right-0.5 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-all shadow-md"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-[#BABABA]' : 'text-[#545454]'}`}>
              Full Name
            </label>
            <input
              name="name"
              placeholder="Your name"
              value={form.name || ""}
              onChange={handleChange}
              className={`w-full px-3 py-1.5 rounded-lg border focus:ring-1 focus:outline-none transition-all text-xs ${
                theme === 'dark' 
                  ? 'bg-[#545454]/40 border-[#7D7D7D]/40 text-white placeholder-[#777] focus:ring-[#7D7D7D]/30' 
                  : 'bg-white border-[#7D7D7D]/20 text-[#252525] placeholder-[#BBB] focus:ring-[#545454]/20'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-[#BABABA]' : 'text-[#545454]'}`}>
              Username
            </label>
            <input
              name="username"
              placeholder="@username"
              value={form.username || ""}
              onChange={handleChange}
              className={`w-full px-3 py-1.5 rounded-lg border focus:ring-1 focus:outline-none transition-all text-xs ${
                theme === 'dark' 
                  ? 'bg-[#545454]/40 border-[#7D7D7D]/40 text-white placeholder-[#777] focus:ring-[#7D7D7D]/30' 
                  : 'bg-white border-[#7D7D7D]/20 text-[#252525] placeholder-[#BBB] focus:ring-[#545454]/20'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-[#BABABA]' : 'text-[#545454]'}`}>
              City
            </label>
            <input
              name="city"
              placeholder="Your city"
              value={form.city || ""}
              onChange={handleChange}
              className={`w-full px-3 py-1.5 rounded-lg border focus:ring-1 focus:outline-none transition-all text-xs ${
                theme === 'dark' 
                  ? 'bg-[#545454]/40 border-[#7D7D7D]/40 text-white placeholder-[#777] focus:ring-[#7D7D7D]/30' 
                  : 'bg-white border-[#7D7D7D]/20 text-[#252525] placeholder-[#BBB] focus:ring-[#545454]/20'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-[#BABABA]' : 'text-[#545454]'}`}>
              Mobile
            </label>
            <input
              name="mobile_no"
              placeholder="Phone"
              value={form.mobile_no || ""}
              onChange={handleChange}
              className={`w-full px-3 py-1.5 rounded-lg border focus:ring-1 focus:outline-none transition-all text-xs ${
                theme === 'dark' 
                  ? 'bg-[#545454]/40 border-[#7D7D7D]/40 text-white placeholder-[#777] focus:ring-[#7D7D7D]/30' 
                  : 'bg-white border-[#7D7D7D]/20 text-[#252525] placeholder-[#BBB] focus:ring-[#545454]/20'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-[#BABABA]' : 'text-[#545454]'}`}>
              Pronouns
            </label>
            <select
              name="pronouns"
              value={form.pronouns || ""}
              onChange={handleChange}
              className={`w-full px-3 py-1.5 rounded-lg border focus:ring-1 focus:outline-none transition-all appearance-none text-xs ${
                theme === 'dark' 
                  ? 'bg-[#545454]/40 border-[#7D7D7D]/40 text-white focus:ring-[#7D7D7D]/30' 
                  : 'bg-white border-[#7D7D7D]/20 text-[#252525] focus:ring-[#545454]/20'
              }`}
            >
              <option value="">Select</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-[#BABABA]' : 'text-[#545454]'}`}>
            Bio
          </label>
          <textarea
            name="bio"
            placeholder="Tell us about yourself..."
            value={form.bio || ""}
            onChange={handleChange}
            rows={2}
            className={`w-full px-3 py-1.5 rounded-lg border focus:ring-1 focus:outline-none transition-all resize-none text-xs ${
              theme === 'dark' 
                ? 'bg-[#545454]/40 border-[#7D7D7D]/40 text-white placeholder-[#777] focus:ring-[#7D7D7D]/30' 
                : 'bg-white border-[#7D7D7D]/20 text-[#252525] placeholder-[#BBB] focus:ring-[#545454]/20'
            }`}
          />
        </div>

        <button
          onClick={handleLogin}
          className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg flex items-center justify-center gap-2 text-xs ${
            theme === 'dark'
              ? 'bg-[#7D7D7D] hover:bg-[#8D8D8D] text-white shadow-[#000]/10'
              : 'bg-[#545454] hover:bg-[#333] text-white shadow-[#545454]/10'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          Complete Setup
        </button>
      </div>
    </div>
  );
}
