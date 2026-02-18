"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { User, Edit3, Save, X, ArrowLeft, Camera, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    city: "",
    mobile_no: "",
    pronouns: "",
    avatar_url: "",
  });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/signup');
      return;
    }

    fetch(`/api/profile`, {
      headers: { "x-user-id": userId }
    })
    .then(res => res.json())
    .then(data => {
      if (data && !data.error) setForm(data);
    });
  }, [router]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    setForm({ ...form, avatar_url: "" });
  };

  const handleCancel = () => {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview("");
  };

  const handleSave = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    let avatarUrl = form.avatar_url;

    // If there's a new avatar file, upload it first
    if (avatarFile) {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const uploadRes = await fetch("/api/upload-avatar", {
        method: "POST",
        headers: {
          "x-user-id": userId,
        },
        body: formData,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        avatarUrl = uploadData.url;
      } else {
        alert("Failed to upload avatar");
        return;
      }
    }

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({ ...form, avatar_url: avatarUrl }),
    });

    if (res.ok) {
      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview("");
      alert("Profile updated!");
    }
  };

  return (
    <div className="min-h-screen p-3">
      
      <div className={`max-w-2xl mx-auto rounded-2xl p-4 ${
        theme === 'dark' ? 'bg-[#252525]/90 border border-[#545454]' : 'bg-gray-100 border border-gray-300'
      } shadow-sm`}>
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              Profile
            </h1>
          </div>
          
          {/* BUTTON LOGIC */}
          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors duration-200 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-lg flex items-center gap-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {/* AVATAR */}
        <div className="flex justify-center mb-2">
          <div className="relative overflow-visible">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar Preview"
                className={`w-24 h-24 rounded-full object-cover border-4 ${
                  theme === 'dark' ? 'border-[#545454]' : 'border-gray-400'
                }`}
              />
            ) : form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt="Avatar"
                className={`w-24 h-24 rounded-full object-cover border-4 ${
                  theme === 'dark' ? 'border-[#545454]' : 'border-gray-400'
                }`}
              />
            ) : (
              <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${
                theme === 'dark' ? 'bg-[#545454] border-[#545454]' : 'bg-gray-200 border-gray-400'
              }`}>
                <User className={`w-8 h-8 ${
                  theme === 'dark' ? 'text-[#7D7D7D]' : 'text-gray-500'
                }`} />
              </div>
            )}
            
            {editing && (
              <>
                {/* Camera Icon - Bottom Right */}
                <div className="absolute bottom-0 right-0 z-10">
                  <label className="bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors duration-200 shadow-lg border-2 border-white block">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                
                {/* Remove Image Icon - Above Camera */}
                {(form.avatar_url || avatarPreview) && (
                  <div className="absolute bottom-12 right-0 z-10 transform translate-x-4">
                    <button
                      onClick={handleRemoveImage}
                      className="bg-red-600 text-white p-2 rounded-full cursor-pointer hover:bg-red-700 transition-colors duration-200 shadow-lg border-2 border-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* NAME */}
        <div className="text-center mb-3">
          <h2 className={`text-xl font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            {form.name || 'Your Name'}
          </h2>
          <p className={theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-600'}>
            @{form.username || 'username'}
          </p>
        </div>

        {/* DETAILS */}
        <div className="space-y-3">
          {/* BIO */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-700'
            }`}>
              Bio
            </label>
            {editing ? (
              <textarea
                name="bio"
                value={form.bio || ""}
                onChange={handleChange}
                rows={2}
                className={`w-full p-3 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-[#545454] border-[#7D7D7D] text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            ) : (
              <p className={`p-3 rounded-lg ${
                theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-600'
              }`}>
                {form.bio || 'No bio'}
              </p>
            )}
          </div>

          {/* GRID FOR FIELDS */}
          <div className="grid grid-cols-2 gap-3">
            {/* NAME */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-700'
              }`}>
                Name
              </label>
              {editing ? (
                <input
                  name="name"
                  value={form.name || ""}
                  onChange={handleChange}
                  className={`w-full p-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-[#545454] border-[#7D7D7D] text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              ) : (
                <p className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-600'
                }`}>
                  {form.name || 'Not set'}
                </p>
              )}
            </div>

            {/* CITY */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-700'
              }`}>
                City
              </label>
              {editing ? (
                <input
                  name="city"
                  value={form.city || ""}
                  onChange={handleChange}
                  className={`w-full p-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-[#545454] border-[#7D7D7D] text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              ) : (
                <p className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-600'
                }`}>
                  {form.city || 'Not set'}
                </p>
              )}
            </div>

            {/* MOBILE */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-700'
              }`}>
                Mobile
              </label>
              {editing ? (
                <input
                  name="mobile_no"
                  value={form.mobile_no || ""}
                  onChange={handleChange}
                  className={`w-full p-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-[#545454] border-[#7D7D7D] text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              ) : (
                <p className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-600'
                }`}>
                  {form.mobile_no || 'Not set'}
                </p>
              )}
            </div>

            {/* PRONOUNS */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-700'
              }`}>
                Pronouns
              </label>
              {editing ? (
                <select
                  name="pronouns"
                  value={form.pronouns || ""}
                  onChange={handleChange}
                  className={`w-full p-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-[#545454] border-[#7D7D7D] text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Select</option>
                  <option value="he/him">he/him</option>
                  <option value="she/her">she/her</option>
                  <option value="they/them">they/them</option>
                </select>
              ) : (
                <p className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'text-[#CFCFCF]' : 'text-gray-600'
                }`}>
                  {form.pronouns || 'Not set'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
