"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const features = [
  {
    icon: "📝",
    title: "Smart Notes",
    desc: "Rich text editor with slash commands, AI inline suggestions, tables, code blocks, and real-time collaboration.",
  },
  {
    icon: "📄",
    title: "PDF Study Tools",
    desc: "Upload any PDF — textbooks, papers, lecture slides. Summarize, annotate, and generate quizzes instantly.",
  },
  {
    icon: "🤖",
    title: "AI Teacher",
    desc: "Your personal 24/7 study assistant. Ask questions, run exercises, and get topic breakdowns on demand.",
  },
  {
    icon: "📂",
    title: "Workspaces",
    desc: "Organize notes by subject, course, or project. Pin, favourite, and search across your entire library.",
  },
  {
    icon: "🎯",
    title: "Task Planner",
    desc: "Daily to-do lists, project boards, and deadlines — all synced with your study calendar.",
  },
  {
    icon: "📊",
    title: "Study Consistency",
    desc: "Track streaks, monitor weak topics, and get AI-driven revision suggestions based on your history.",
  },
];

const stats = [
  { value: "10x", label: "Faster revision" },
  { value: "AI", label: "Powered learning" },
  { value: "100%", label: "Free to start" },
  { value: "∞", label: "Notes & workspaces" },
];

interface LandingPageProps {
  isLoggedIn?: boolean;
}

export default function LandingPage({ isLoggedIn = false }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-white overflow-x-hidden" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#0C0C0C]/90 backdrop-blur-xl border-b border-white/5" : ""}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/azviq_logo.png" alt="Azviq" className="w-8 h-8 rounded-lg object-contain invert" />
            <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "var(--font-lexend)" }}>Azviq</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#showcase" className="hover:text-white transition-colors">Showcase</a>
            <a href="#stats" className="hover:text-white transition-colors">Why Azviq</a>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-sm font-semibold bg-white text-[#0C0C0C] hover:bg-white/90 px-4 py-2 rounded-full transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5">
                Open App
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">
                  Log in
                </Link>
                <Link href="/signup" className="text-sm font-semibold bg-white text-[#0C0C0C] hover:bg-white/90 px-4 py-2 rounded-full transition-all hover:scale-105 active:scale-95">
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-0 px-6 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#C2A27A]/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-purple-500/8 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-blue-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 text-xs text-white/60 backdrop-blur-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse inline-block" />
            Now with personal AI Teacher
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-white">Your AI-Powered</span>
            <br />
            <span className="bg-gradient-to-r from-[#C2A27A] via-[#E8C99A] to-[#C2A27A] bg-clip-text text-transparent">
              Study Workspace
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Notes, PDFs, AI teacher, and task planner — all in one place. Study smarter, stay consistent, and actually remember what you learn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {isLoggedIn ? (
              <Link href="/dashboard" className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-[#0C0C0C] font-semibold px-8 py-3.5 rounded-full text-base hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                Go to Dashboard
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            ) : (
              <>
                <Link href="/signup" className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-[#0C0C0C] font-semibold px-8 py-3.5 rounded-full text-base hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                  Get Azviq Free
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 border border-white/10 text-white/70 hover:text-white hover:border-white/20 font-medium px-8 py-3.5 rounded-full text-base transition-all hover:bg-white/5">
                  Sign in instead
                </Link>
              </>
            )}
          </div>

          <div className="relative w-full max-w-5xl mx-auto">
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-4/5 h-20 bg-[#C2A27A]/20 blur-3xl" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] bg-[#141414]">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white/5 rounded-md px-3 py-1 text-xs text-white/30 text-center max-w-xs mx-auto">
                    azviq.in/dashboard
                  </div>
                </div>
              </div>
              <Image
                src="/getstarted_img/home.png"
                alt="Azviq Dashboard"
                width={1400}
                height={800}
                className="w-full object-cover object-top"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0C0C0C] to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center group">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 group-hover:text-[#C2A27A] transition-colors duration-300">
                {s.value}
              </div>
              <div className="text-sm text-white/40 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[#C2A27A] mb-4 font-semibold">Everything you need</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Built for serious learners
            </h2>
            <p className="mt-4 text-white/40 text-lg max-w-xl mx-auto">
              Every tool you need to study effectively, organized in one beautiful workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#C2A27A]/0 to-[#C2A27A]/0 group-hover:from-[#C2A27A]/5 group-hover:to-transparent transition-all duration-500" />
                <div className="relative">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-white text-lg mb-2">{f.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE */}
      <section id="showcase" className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#C2A27A]/5 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[#C2A27A] mb-4 font-semibold">See it in action</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Your workspace, supercharged
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <h3 className="font-semibold text-white">AI Study Assistant</h3>
                  <p className="text-white/40 text-sm">Powered by Gemini</p>
                </div>
              </div>
              <div className="flex-1 bg-[#141414] rounded-xl p-4 font-mono text-sm space-y-3">
                <div className="flex gap-3">
                  <span className="text-white/20 shrink-0">You</span>
                  <p className="text-white/60">Explain photosynthesis in simple terms</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#C2A27A] shrink-0">AI</span>
                  <p className="text-white/80">Photosynthesis is how plants make food using sunlight. They take in CO₂ + water and convert them to glucose + oxygen using chlorophyll. Think of it as the plant's solar panel system... <span className="inline-block w-2 h-4 bg-[#C2A27A] animate-pulse rounded-sm align-middle ml-1" /></p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                <div className="text-2xl mb-3">📊</div>
                <h3 className="font-semibold text-white mb-2">Study Consistency</h3>
                <div className="grid grid-cols-7 gap-1">
                  {[0,0,0,0,0,0,0, 0,0,0,1,0,1,0, 0,1,1,0,1,1,0, 1,1,1,1,1,0,1, 1,1,1,1,1,1,1].map((v, i) => (
                    <div key={i} className={`w-full aspect-square rounded-sm ${v ? (i > 28 ? "bg-[#C2A27A]" : "bg-[#C2A27A]/50") : "bg-white/5"}`} />
                  ))}
                </div>
                <p className="text-white/30 text-xs mt-3">7-day streak 🔥</p>
              </div>

              <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                <div className="text-2xl mb-3">🎯</div>
                <h3 className="font-semibold text-white mb-3">Today's Tasks</h3>
                {["Review Chapter 5", "Complete AI exercise", "Revise weak topics"].map((t, i) => (
                  <div key={t} className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded border ${i === 0 ? "bg-[#C2A27A] border-[#C2A27A]" : "border-white/20"} flex items-center justify-center shrink-0`}>
                      {i === 0 && <svg className="w-2.5 h-2.5 text-[#0C0C0C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-xs ${i === 0 ? "line-through text-white/30" : "text-white/60"}`}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#C2A27A]/10 via-[#C2A27A]/5 to-[#C2A27A]/10 rounded-3xl blur-3xl" />
          <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-3xl px-8 py-20">
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
              Start studying smarter
              <br />
              <span className="text-[#C2A27A]">today. For free.</span>
            </h2>
            <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">
              Join thousands of students using Azviq to organize their knowledge, study with AI, and actually retain what they learn.
            </p>
            <Link href="/signup" className="inline-flex items-center gap-3 bg-white text-[#0C0C0C] font-semibold px-10 py-4 rounded-full text-base hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_60px_rgba(255,255,255,0.15)]">
              Create your free workspace
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/azviq_logo.png" alt="Azviq" className="w-6 h-6 rounded object-contain invert opacity-50" />
            <span className="text-white/30 text-sm" style={{ fontFamily: "var(--font-lexend)" }}>Azviq</span>
          </div>
          <p className="text-white/20 text-sm">© 2025 Azviq. Built for learners.</p>
          <div className="flex gap-6 text-sm text-white/30">
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
