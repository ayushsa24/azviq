"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { X, User, Edit3, Save, Camera, Trash2 } from "lucide-react";
import Image from "next/image";
import { useAppDialog } from "@/components/ui/AppDialog";
import { useSession } from "next-auth/react";
import { getAvatarColor } from "@/lib/utils";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function ProfileModal({ open, onClose }: Props) {
    const { theme } = useTheme();
    const searchParams = useSearchParams();
    const fromParam = searchParams.get("from") || "/dashboard";
    const isDark = theme === "dark";
    const dialog = useAppDialog();
    const { update } = useSession();

    const [editing, setEditing] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [form, setForm] = useState({
        name: "", username: "", bio: "", city: "",
        mobile_no: "", pronouns: "", avatar_url: "",
    });

    useEffect(() => {
        if (!open) return;
        const userId = localStorage.getItem("userId");
        if (!userId) return;
        fetch("/api/profile", { headers: { "x-user-id": userId } })
            .then(r => r.json())
            .then(d => { if (d && !d.error) setForm(d); });
    }, [open]);

    if (!open) return null;

    const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result as string);
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

    const handleCloseModal = () => {
        if (typeof window !== "undefined") {
            window.history.pushState(null, '', fromParam);
        }
        onClose();
    };

    const handleSave = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;
        let avatarUrl = form.avatar_url;
        if (avatarFile) {
            const fd = new FormData();
            fd.append("avatar", avatarFile);
            const up = await fetch("/api/upload-avatar", { method: "POST", headers: { "x-user-id": userId }, body: fd });
            if (up.ok) { const d = await up.json(); avatarUrl = d.url; }
            else { dialog.showAlert("Failed to upload avatar", "error"); return; }
        }
        const res = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "x-user-id": userId },
            body: JSON.stringify({ ...form, avatar_url: avatarUrl }),
        });
        if (res.ok) { 
            setForm({ ...form, avatar_url: avatarUrl });
            setEditing(false); 
            setAvatarFile(null); 
            setAvatarPreview(""); 
            await update(); // Force NextAuth to refresh the global session immediately
        }
    };

    const inputCls = `w-full p-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? "bg-[#2E2E2E] border-[#3A3A3A] text-[#CFCFCF]" : "bg-white border-[#7D7D7D]/40 text-[#252525]"
        }`;
    const labelCls = `block text-xs font-semibold mb-1 ${isDark ? "text-[#7D7D7D]" : "text-[#9E9E9E]"}`;
    const valueCls = `p-2 text-sm rounded-lg ${isDark ? "text-[#CFCFCF]" : "text-[#252525]"}`;

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-[400] flex items-center justify-center p-4"
            onClick={handleCloseModal}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

            {/* Modal card */}
            <div
                className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden
          ${isDark ? "bg-[#1A1A1A] md:dark:bg-[#1F1F1F] border border-[#2E2E2E]" : "bg-white border border-[#7D7D7D]/40"}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b backdrop-blur-[2px] ${isDark ? "bg-[#1A1A1A]/90 border-[#2E2E2E]" : "bg-white/90 border-[#F0EDE8]"}`}>
                    <h2 className={`text-base font-bold ${isDark ? "text-[#CFCFCF]" : "text-[#252525]"}`}>My Profile</h2>
                    <div className="flex items-center gap-2">
                        {editing ? (
                            <>
                                <button onClick={handleCancel} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">Cancel</button>
                                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors">
                                    <Save className="w-3 h-3" /> Save
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setEditing(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors
                ${isDark ? "bg-[#2E2E2E] text-[#CFCFCF] hover:bg-[#3A3A3A]" : "bg-[#F0EDE8] text-[#252525] hover:bg-[#E8E5E0]"}`}>
                                <Edit3 className="w-3 h-3" /> Edit
                            </button>
                        )}
                        <button onClick={handleCloseModal} aria-label="Close Profile Modal" className={`p-1.5 rounded-xl transition-colors ${isDark ? "hover:bg-[#2E2E2E] text-[#7D7D7D]" : "hover:bg-[#CFCFCF] text-[#9E9E9E]"}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Avatar */}
                    <div className="flex justify-center">
                        <div className="relative">
                            {avatarPreview || form.avatar_url ? (
                                <Image 
                                    src={avatarPreview || form.avatar_url} 
                                    alt="Avatar" 
                                    width={80} 
                                    height={80} 
                                    className="w-20 h-20 rounded-full object-cover ring-4 ring-offset-2 ring-[#E8E5E0] dark:ring-[#2E2E2E]" 
                                    unoptimized={avatarPreview.startsWith("data:")}
                                />
                            ) : (
                                <div 
                                    className="w-20 h-20 rounded-full flex items-center justify-center ring-4 ring-offset-2 ring-transparent text-white font-bold text-3xl"
                                    style={{ backgroundColor: getAvatarColor(form?.name) }}
                                >
                                    {(form.name?.[0] || 'A').toUpperCase()}
                                </div>
                            )}
                            {editing && (
                                <>
                                    <label aria-label="Upload avatar" className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-600 shadow-md">
                                        <Camera className="w-3.5 h-3.5" />
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" aria-hidden="true" />
                                    </label>
                                    {(form.avatar_url || avatarPreview) && (
                                        <button onClick={handleRemoveImage} aria-label="Remove avatar" className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Name display */}
                    <div className="text-center -mt-1">
                        <p className={`text-base font-bold ${isDark ? "text-[#CFCFCF]" : "text-[#252525]"}`}>{form.name || "Your Name"}</p>
                        <p className="text-xs text-[#7D7D7D] mt-0.5">@{form.username || "username"}</p>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className={labelCls}>Bio</label>
                        {editing
                            ? <textarea name="bio" value={form.bio || ""} onChange={handleChange} rows={2} className={inputCls} />
                            : <p className={valueCls}>{form.bio || <span className="opacity-40 italic">No bio</span>}</p>}
                    </div>

                    {/* Grid fields */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: "name", label: "Name" },
                            { key: "city", label: "City" },
                            { key: "mobile_no", label: "Mobile" },
                        ].map(({ key, label }) => (
                            <div key={key}>
                                <label className={labelCls}>{label}</label>
                                {editing
                                    ? <input name={key} value={(form as any)[key] || ""} onChange={handleChange} className={inputCls} />
                                    : <p className={valueCls}>{(form as any)[key] || <span className="opacity-40 italic">Not set</span>}</p>}
                            </div>
                        ))}

                        {/* Pronouns */}
                        <div>
                            <label className={labelCls}>Pronouns</label>
                            {editing ? (
                                <select name="pronouns" value={form.pronouns || ""} onChange={handleChange} className={inputCls}>
                                    <option value="">Select</option>
                                    <option value="he/him">he/him</option>
                                    <option value="she/her">she/her</option>
                                    <option value="they/them">they/them</option>
                                </select>
                            ) : (
                                <p className={valueCls}>{form.pronouns || <span className="opacity-40 italic">Not set</span>}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
