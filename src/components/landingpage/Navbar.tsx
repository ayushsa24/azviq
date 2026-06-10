"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface NavbarProps {
  isLoggedIn?: boolean;
}

const NAV_LINKS = ["Features", "Pricing", "Blog"];

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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/40 backdrop-blur-md border border-black/[0.08] rounded-lg flex items-center justify-center p-0 shadow-sm">
              <img src="/azviq_logo.png" alt="Azviq Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-[#1D1D1F] text-base">Azviq</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors font-semibold uppercase tracking-wider">
                {l}
              </a>
            ))}
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
