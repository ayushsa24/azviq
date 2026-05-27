"use client";

export default function DashboardShowcaseSection() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-[#F4F4F6] to-white border-t border-black/[0.05]">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-xs text-[#E84B1B] uppercase tracking-[0.12em] mb-4 font-semibold">Your Study Command Center</p>
        <h2 className="text-[32px] md:text-[44px] font-extrabold text-[#1D1D1F] mb-4 tracking-tight leading-tight">
          A beautiful, distraction-free dashboard
        </h2>
        <p className="text-[14px] md:text-[16px] text-[#6E6E73] max-w-[620px] mx-auto mb-14 leading-relaxed font-medium">
          Monitor your daily study streaks, manage active tasks, launch quick Pomodoro timers, and access your notes and AI tutor instantly from one unified workspace.
        </p>
        <div className="relative mx-auto max-w-4xl rounded-2xl border border-black/[0.08] bg-[#F4F4F6] p-2 shadow-2xl overflow-hidden">
          {/* Window control dots like macOS */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-black/[0.04] bg-[#F4F4F6] items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] opacity-80" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] opacity-80" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] opacity-80" />
          </div>
          <img 
            src="/landingpage/home.png" 
            alt="Azviq Dashboard Screenshot" 
            className="w-full h-auto rounded-b-xl"
          />
        </div>
      </div>
    </section>
  );
}
