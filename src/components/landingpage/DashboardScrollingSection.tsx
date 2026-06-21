"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface BulletPoint {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

interface DashboardFeature {
  title: string;
  desc: string;
  category: string;
  accent: string;
  bullets: BulletPoint[];
  image: string;
}

const DASHBOARD_FEATURES: DashboardFeature[] = [
  {
    title: "AI Focus Stats & Timer",
    desc: "Track active revision session durations with built-in Pomodoro timing and view urgent study indicators. Stay hyper-focused by segmenting study blocks, filtering distractions, and prioritizing immediate learning goals directly on your dashboard.",
    category: "Focus Hub",
    accent: "#3B82F6", // Blue
    bullets: [
      {
        title: "Integrated Pomodoro Timer",
        desc: "Set standard 25-minute focus intervals or customize your study-to-break durations to optimize retention and fight screen fatigue.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      {
        title: "Urgent Action Alerts",
        desc: "Stay updated with live prompts highlighting tasks due in the next 24 hours alongside critical notes containing weak topic areas.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/dashboard.png",
  },
  {
    title: "Daily Tasks & To-Do List",
    desc: "Manage daily educational requirements and mark tasks complete with custom workspace badges. Keep your schedule organized, assign priorities to different topics, and coordinate all study checklists from one clean view.",
    category: "Daily Checklist",
    accent: "#F59E0B", // Amber
    bullets: [
      {
        title: "Workspace Badge Tags",
        desc: "Know exactly where each task lives. Easily sort items belonging to your Library, note-taking pages, quizzes, or collaborative Kanban boards.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      },
      {
        title: "Quick Complete Actions",
        desc: "Check tasks off instantly with immediate updates that dynamically recalculate your weekly progress metrics and streak counts.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/dashboard.png",
  },
  {
    title: "Study Consistency & Streaks",
    desc: "Monitor study consistency parameters, streak durations, and overall learning hours. Build healthy habits with visual streak lines, heatmaps, and achievements that celebrate your progress.",
    category: "Consistency",
    accent: "#E84B1B", // Orange/Rose
    bullets: [
      {
        title: "Weekly Streak Maps",
        desc: "Visualize your weekly and monthly study patterns on a mini grid. Keep your fire indicators active by studying a minimum duration every day.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      },
      {
        title: "Historical Performance Metrics",
        desc: "Analyze parameters including Total Study Days, Total Hours accumulated, Current active streak counts, and your all-time Longest Streak record.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/dashboard.png",
  },
  {
    title: "AI Suggestions & Recommendations",
    desc: "Get tailored revision directions based on weak topics, previous quiz scores, and spaced repetition schedules. The AI analyzes your quiz performance to automatically recommend notes that need review.",
    category: "AI Recommendations",
    accent: "#10B981", // Emerald
    bullets: [
      {
        title: "Weak Topic Warnings",
        desc: "Receive immediate feedback showing subject areas where your test score fell below target, helping you fix comprehension gaps before exams.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      },
      {
        title: "Spaced Repetition Prompts",
        desc: "Get automated alerts suggesting revision or card practice for specific subjects that are starting to fade from your active memory.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        )
      }
    ],
    image: "/landingpage/dashboard.png",
  }
];

export default function DashboardScrollingSection() {
  const [activeFeature, setActiveFeature] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const sectionHeight = sectionRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;
        const scrolledIntoSection = -rect.top;
        if (scrolledIntoSection >= 0) {
          const scrollableDistance = sectionHeight - viewportHeight;
          const progress = Math.max(0, Math.min(1, scrolledIntoSection / (scrollableDistance || 1)));
          const idx = Math.min(
            Math.floor(progress * DASHBOARD_FEATURES.length),
            DASHBOARD_FEATURES.length - 1
          );
          setActiveFeature(idx);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section id="dashboard" ref={sectionRef} className="relative w-full bg-[#F4F4F6]/50 border-t border-black/[0.05]">
      {/* Scroll track */}
      <div className="w-full" style={{ height: `${(DASHBOARD_FEATURES.length * 50) + 100}vh` }}>
        <div className="sticky top-0 h-screen flex flex-col justify-center md:flex-row items-center px-6 md:px-16 max-w-7xl mx-auto w-full">

          {/* LEFT — Text + Bullets */}
          <div className="w-full md:w-[42%] relative h-[480px] md:h-[580px]">
            {DASHBOARD_FEATURES.map((f, index) => (
              <motion.div
                key={index}
                className="absolute inset-0 flex flex-col justify-center pr-0 md:pr-16"
                initial={false}
                animate={{
                  opacity: activeFeature === index ? 1 : 0,
                  y: activeFeature === index ? 0 : (index > activeFeature ? 40 : -40),
                  pointerEvents: activeFeature === index ? "auto" : "none",
                }}
                transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {/* Category badge */}
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="text-[11px] uppercase tracking-[0.14em] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${f.accent}12`, color: f.accent }}
                  >
                    {f.category}
                  </span>
                  <p className="text-xs text-[#6E6E73] uppercase tracking-[0.12em] font-semibold">
                    Dashboard Feature 0{index + 1}
                  </p>
                </div>

                {/* Headline */}
                <h3 className="text-[28px] md:text-[38px] font-bold text-[#1D1D1F] leading-tight mb-4">
                  {f.title}
                </h3>

                {/* Description */}
                <p className="text-[14px] md:text-[16px] text-[#6E6E73] leading-relaxed font-medium mb-6 max-w-[460px]">
                  {f.desc}
                </p>

                {/* Bullet cards */}
                <div className="flex flex-col gap-4 max-w-[480px]">
                  {f.bullets.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-3.5 bg-black/[0.02] border border-black/[0.04] p-3 rounded-xl hover:bg-black/[0.03] transition-all duration-150">
                      <div
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
                        style={{ backgroundColor: `${f.accent}16`, color: f.accent }}
                      >
                        {b.icon}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[#1D1D1F]">{b.title}</h4>
                        <p className="text-xs text-[#6E6E73] mt-0.5 leading-relaxed">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress dots */}
                <div className="flex gap-2 mt-8">
                  {DASHBOARD_FEATURES.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === activeFeature ? "w-6 bg-[#E84B1B]" : "w-1.5 bg-black/15"}`} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* RIGHT — Animated Image Showcase */}
          <div className="hidden md:flex w-full md:w-[58%] items-center justify-center pl-8 md:pl-12 h-[500px]">
            <div className="relative w-full h-full rounded-2xl border border-black/[0.08] bg-white shadow-2xl overflow-hidden">
              {DASHBOARD_FEATURES.map((feat, index) => (
                <motion.img
                  key={index}
                  src={feat.image}
                  alt={feat.title}
                  className="absolute w-full h-full object-cover object-left-top"
                  animate={{
                    opacity: activeFeature === index ? 1 : 0,
                    scale: activeFeature === index ? 1 : 1.04,
                  }}
                  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
