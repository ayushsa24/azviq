"use client";

const BENTO = [
  { badge: "DASHBOARD", title: "Your study command center", desc: "See everything at a glance. Study time, due tasks, revision schedule, AI suggestions, and your consistency heatmap — all in one place.", span: 2, glow: "" },
  { badge: "AI CHAT", title: "Ask your AI tutor anything", desc: "Chat with an AI that understands your notes and helps you study smarter.", span: 1, glow: "rgba(59,130,246,0.04)" },
  { badge: "LIBRARY", title: "All your notes in one place", desc: "Store notes, PDFs, workspaces and favourites — organized and searchable.", span: 1, glow: "" },
  { badge: "TASKS", title: "Manage projects & tasks", desc: "Kanban board for your study projects. Track progress from Not Started to Done.", span: 1, glow: "" },
  { badge: "PREPARATION", title: "Practice, revise, master", desc: "AI-generated exercises, revision sessions and an AI Teacher that adapts to your weak areas and learning pace.", span: 2, glow: "rgba(34,197,94,0.03)" },
];

export default function FeaturesBento() {
  return (
    <section id="features" className="py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-xs text-[#6E6E73] uppercase tracking-[0.1em] mb-4 font-semibold">Everything you need</p>
        <h2 className="text-center text-[40px] font-bold text-[#1D1D1F] mb-4">One app. Every study tool.</h2>
        <p className="text-center text-[#6E6E73] text-base max-w-[560px] mx-auto mb-14 leading-relaxed">
          From AI-powered notes to smart scheduling, Azviq has every tool you need to study smarter, not harder.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BENTO.map((c) => (
            <div key={c.badge} className={`${c.span === 2 ? "md:col-span-2" : ""} relative bg-[#F4F4F6]/50 border border-black/[0.06] rounded-2xl p-7 hover:border-black/15 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 overflow-hidden`}>
              {c.glow && <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `radial-gradient(circle at 50% 100%, ${c.glow}, transparent 60%)` }} />}
              <p className="text-[11px] text-[#88888F] uppercase tracking-[0.12em] mb-3 font-semibold">{c.badge}</p>
              <h3 className="text-xl font-bold text-[#1D1D1F] mb-2">{c.title}</h3>
              <p className="text-[14px] text-[#6E6E73] leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
