"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, MessageCircle, Library, CheckSquare, Sparkles } from "lucide-react";

interface NavbarProps {
  isLoggedIn?: boolean;
}


export default function Navbar({ isLoggedIn = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b px-6 ${scrolled ? "bg-[rgba(244,244,246,0.95)] backdrop-blur-xl border-black/[0.06] shadow-sm" : "bg-transparent border-transparent"}`}>
      <div className="max-w-6xl mx-auto w-full h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-white/40 backdrop-blur-md border border-black/[0.08] rounded-lg flex items-center justify-center p-0 shadow-sm transition-all duration-200 group-hover:scale-[1.03]">
              <img src="/azviq_logo.png" alt="Azviq Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-[#1D1D1F] text-base">Azviq</span>
          </a>
          <div className="hidden md:flex items-center gap-6 h-14">
            {/* Features Hover Trigger & Dropdown Menu */}
            <div className="relative group h-full flex items-center">
              <a 
                href="/#features" 
                className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors font-semibold uppercase tracking-wider cursor-pointer flex items-center gap-1 group/btn"
              >
                <span>Features</span>
                <svg className="w-2.5 h-2.5 opacity-60 group-hover:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
              
              {/* Dropdown Popover */}
              <div className="absolute top-[48px] left-1/2 -translate-x-1/2 w-[180px] bg-white border border-black/[0.08] shadow-xl rounded-xl p-1.5 transition-all duration-300 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transform translate-y-2 group-hover:translate-y-0 flex flex-col gap-0.5 z-50">
                
                {/* Dashboard */}
                <a href="/#dashboard" className="px-3 py-2 rounded-lg hover:bg-black/[0.03] transition-colors duration-150 text-[11px] font-bold text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-2.5">
                  <Home className="w-3.5 h-3.5 opacity-70" />
                  <span>Dashboard</span>
                </a>

                {/* AI Chat */}
                <a href="/#ai-chat" className="px-3 py-2 rounded-lg hover:bg-black/[0.03] transition-colors duration-150 text-[11px] font-bold text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-2.5">
                  <MessageCircle className="w-3.5 h-3.5 opacity-70" />
                  <span>AI Chat</span>
                </a>

                {/* Library */}
                <a href="/#library" className="px-3 py-2 rounded-lg hover:bg-black/[0.03] transition-colors duration-150 text-[11px] font-bold text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-2.5">
                  <Library className="w-3.5 h-3.5 opacity-70" />
                  <span>Library</span>
                </a>

                {/* Project & Tasks */}
                <a href="/#tasks" className="px-3 py-2 rounded-lg hover:bg-black/[0.03] transition-colors duration-150 text-[11px] font-bold text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-2.5">
                  <CheckSquare className="w-3.5 h-3.5 opacity-70" />
                  <span>Project & Tasks</span>
                </a>

                {/* Preparation */}
                <a href="/#preparation" className="px-3 py-2 rounded-lg hover:bg-black/[0.03] transition-colors duration-150 text-[11px] font-bold text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 opacity-70" />
                  <span>Preparation</span>
                </a>
              </div>
            </div>

            <a href="/#pricing" className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors font-semibold uppercase tracking-wider">
              Pricing
            </a>

            <a href="/contact" className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors font-semibold uppercase tracking-wider">
              Contact
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard" className="text-sm bg-black text-white font-semibold px-4 py-1.5 rounded-full hover:bg-black/90 transition-all">
              Open App →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition-colors px-3 py-1.5 font-medium">
                Sign in
              </Link>
              <Link href="/signup" className="text-sm bg-black text-white font-semibold px-4 py-1.5 rounded-full hover:bg-black/90 transition-all font-medium">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
