"use client";
import { motion } from "framer-motion";

export default function FeaturesBento() {
  return (
    <section id="features" className="py-28 px-6 bg-white border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-xs text-[#E84B1B] uppercase tracking-[0.15em] mb-4 font-bold">
          Everything you need
        </p>
        <h2 className="text-center text-[36px] md:text-[44px] font-bold text-[#1D1D1F] mb-4 tracking-tight leading-tight">
          One app. Every study tool.
        </h2>
        <p className="text-center text-[#6E6E73] text-base md:text-lg max-w-[580px] mx-auto mb-16 leading-relaxed font-medium">
          From AI-powered notes to smart scheduling, Azviq has every tool you need to study smarter, not harder.
        </p>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto">
          
          {/* 1. DASHBOARD CARD (span-2, row-1) */}
          <div className="md:col-span-2 group relative bg-[#F4F4F6]/60 border border-black/[0.05] rounded-3xl p-8 hover:bg-white hover:border-black/15 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden h-[360px]">
            {/* Background Glow */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-all duration-300" />
            
            <div className="relative z-10">
              <p className="text-[11px] text-indigo-600 uppercase tracking-[0.14em] mb-3.5 font-bold">
                Dashboard
              </p>
              <h3 className="text-2xl font-bold text-[#1D1D1F] mb-3">
                Your study command center
              </h3>
              <p className="text-[14px] text-[#6E6E73] leading-relaxed max-w-[440px] font-medium">
                See everything at a glance. Study time, due tasks, revision schedule, AI suggestions, and your consistency heatmap — all in one place.
              </p>
            </div>

            {/* Visual Mockup */}
            <div className="relative w-full h-[140px] bg-white border border-black/[0.06] rounded-2xl p-4 shadow-sm mt-6 overflow-hidden flex gap-6 items-center">
              {/* Stats card */}
              <div className="flex-shrink-0 flex flex-col gap-2 bg-[#F4F4F6]/50 border border-black/[0.04] p-3 rounded-xl w-[140px]">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#888] font-bold uppercase tracking-wider">Today</span>
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
                </div>
                <div className="text-xl font-black text-[#1D1D1F]">02h 45m</div>
                <div className="text-[10px] text-indigo-600 font-semibold">12-Day Streak 🔥</div>
              </div>

              {/* Heatmap Grid */}
              <div className="flex-grow flex flex-col gap-1.5 overflow-hidden">
                <span className="text-[10px] text-[#888] font-bold uppercase tracking-wider mb-1">Consistency Heatmap</span>
                <div className="grid grid-flow-col grid-rows-3 gap-1.5 auto-cols-max">
                  {Array.from({ length: 45 }).map((_, i) => {
                    const opacities = [0.1, 0.25, 0.45, 0.75, 0.9];
                    const activeOp = opacities[i % opacities.length];
                    return (
                      <div
                        key={i}
                        className="w-[10px] h-[10px] rounded-[3px] transition-all duration-300"
                        style={{
                          backgroundColor: `rgba(79, 70, 229, ${activeOp})`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 2. AI CHAT CARD (span-1, row-1 & row-2) */}
          <div className="md:col-span-1 md:row-span-2 group relative bg-[#F4F4F6]/60 border border-black/[0.05] rounded-3xl p-8 hover:bg-white hover:border-black/15 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden h-auto min-h-[360px] md:h-[744px]">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
            
            <div className="relative z-10 mb-6">
              <p className="text-[11px] text-purple-600 uppercase tracking-[0.14em] mb-3.5 font-bold">
                AI Chat
              </p>
              <h3 className="text-2xl font-bold text-[#1D1D1F] mb-3">
                Ask your AI tutor anything
              </h3>
              <p className="text-[14px] text-[#6E6E73] leading-relaxed font-medium">
                Chat with an AI that understands your note pages, files, and lectures to help you study smarter.
              </p>
            </div>

            {/* Chat Visual Mockup */}
            <div className="relative flex-grow bg-white border border-black/[0.06] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[280px] md:h-auto">
              {/* Header */}
              <div className="px-4 py-3 border-b border-black/[0.04] bg-[#F4F4F6]/40 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-[#1D1D1F]">Azviq AI Teacher</span>
              </div>
              {/* Chat log */}
              <div className="p-4 flex flex-col gap-3 overflow-hidden text-xs">
                <div className="self-start bg-[#F4F4F6]/60 text-[#1D1D1F] p-3 rounded-2xl rounded-tl-none max-w-[85%] font-medium">
                  Hello! What concept can I help you master today?
                </div>
                <div className="self-end bg-purple-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[85%] font-medium shadow-sm">
                  What is an isolated system in science?
                </div>
                <div className="self-start bg-[#F4F4F6]/60 text-[#1D1D1F] p-3 rounded-2xl rounded-tl-none max-w-[85%] font-medium flex flex-col gap-1.5">
                  <span className="font-bold text-purple-700">Azviq Teach:</span>
                  <span>An **isolated system** cannot exchange either energy or matter with its surroundings.</span>
                  <span className="text-[10px] text-purple-600 font-bold border-t border-black/5 pt-1 mt-1">Example: A perfectly sealed vacuum flask.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. LIBRARY CARD (span-1, row-2) */}
          <div className="group relative bg-[#F4F4F6]/60 border border-black/[0.05] rounded-3xl p-8 hover:bg-white hover:border-black/15 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden h-[360px]">
            {/* Background Glow */}
            <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-300" />
            
            <div className="relative z-10">
              <p className="text-[11px] text-emerald-600 uppercase tracking-[0.14em] mb-3.5 font-bold">
                Library
              </p>
              <h3 className="text-2xl font-bold text-[#1D1D1F] mb-3">
                All notes in one place
              </h3>
              <p className="text-[14px] text-[#6E6E73] leading-relaxed font-medium">
                Store notes, PDFs, external workspaces and study materials — completely organized and searchable.
              </p>
            </div>

            {/* Folder Mockup */}
            <div className="relative w-full h-[120px] bg-white border border-black/[0.06] rounded-2xl p-4 shadow-sm mt-6 flex flex-col gap-2.5 overflow-hidden">
              <div className="flex items-center gap-3 bg-[#F4F4F6]/50 border border-black/[0.03] px-3.5 py-2 rounded-xl">
                <span className="text-lg">📁</span>
                <div className="flex-grow">
                  <div className="text-xs font-bold text-[#1D1D1F]">Physics & Thermodynamics</div>
                  <div className="text-[9px] text-[#888] font-medium">12 Notes • 4 Quizzes</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#F4F4F6]/50 border border-black/[0.03] px-3.5 py-2 rounded-xl opacity-60">
                <span className="text-lg">📁</span>
                <div className="flex-grow">
                  <div className="text-xs font-bold text-[#1D1D1F]">Organic Chemistry</div>
                  <div className="text-[9px] text-[#888] font-medium">8 Notes • 2 Quizzes</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. TASKS CARD (span-1, row-2) */}
          <div className="group relative bg-[#F4F4F6]/60 border border-black/[0.05] rounded-3xl p-8 hover:bg-white hover:border-black/15 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden h-[360px]">
            {/* Background Glow */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/10 transition-all duration-300" />
            
            <div className="relative z-10">
              <p className="text-[11px] text-rose-600 uppercase tracking-[0.14em] mb-3.5 font-bold">
                Tasks
              </p>
              <h3 className="text-2xl font-bold text-[#1D1D1F] mb-3">
                Manage projects & tasks
              </h3>
              <p className="text-[14px] text-[#6E6E73] leading-relaxed font-medium">
                Sleek Kanban boards for your active projects. Track progress from Not Started to Done easily.
              </p>
            </div>

            {/* Kanban Card Mockup */}
            <div className="relative w-full h-[120px] bg-white border border-black/[0.06] rounded-2xl p-3 shadow-sm mt-6 flex gap-3 overflow-hidden">
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-[#888] uppercase tracking-wider">In Progress</span>
                <div className="bg-[#F4F4F6]/60 border border-black/[0.04] p-2 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[#1D1D1F] truncate">Study Lecture 4</span>
                  <span className="text-[8px] text-rose-500 font-bold">High Priority</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-[#888] uppercase tracking-wider">Done</span>
                <div className="bg-[#F4F4F6]/30 border border-black/[0.04] p-2 rounded-lg flex flex-col gap-1 opacity-70 line-through">
                  <span className="text-[10px] font-bold text-[#1D1D1F] truncate">Solve Quiz 1</span>
                  <span className="text-[8px] text-[#888] font-bold">Completed</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. PREPARATION CARD (span-3, row-3) */}
          <div className="md:col-span-3 group relative bg-[#F4F4F6]/60 border border-black/[0.05] rounded-3xl p-8 hover:bg-white hover:border-black/15 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row justify-between items-center overflow-hidden h-auto min-h-[300px]">
            {/* Background Glow */}
            <div className="absolute -left-16 -top-16 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-all duration-300" />
            
            <div className="relative z-10 max-w-[500px]">
              <p className="text-[11px] text-amber-600 uppercase tracking-[0.14em] mb-3.5 font-bold">
                Preparation
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-[#1D1D1F] mb-3">
                Practice, revise, master
              </h3>
              <p className="text-[14px] md:text-base text-[#6E6E73] leading-relaxed font-medium">
                AI-generated exercises, flashcards, active recall reviews, and an AI Study Teacher that adapts dynamically to your weak areas and learning pace.
              </p>
            </div>

            {/* Quiz Mockup Card */}
            <div className="relative w-full md:w-[380px] bg-white border border-black/[0.06] rounded-2xl p-4 shadow-sm mt-6 md:mt-0 flex flex-col gap-3 overflow-hidden">
              <div className="flex justify-between items-center border-b border-black/[0.04] pb-2">
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Active Recall Quiz</span>
                <span className="text-[9px] text-[#888] font-semibold">Question 1 of 5</span>
              </div>
              <div className="text-[11px] font-bold text-[#1D1D1F] leading-snug">
                Which organelle is widely referred to as the powerhouse of the cell?
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg text-xs text-amber-900 font-bold shadow-sm">
                  <span>Mitochondria</span>
                  <span className="text-amber-600 text-xs">✓</span>
                </div>
                <div className="flex items-center justify-between bg-[#F4F4F6]/50 border border-black/[0.04] px-3 py-2 rounded-lg text-xs text-[#6E6E73] font-medium opacity-65">
                  <span>Ribosome</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
