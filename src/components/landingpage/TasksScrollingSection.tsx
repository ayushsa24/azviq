"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface BulletPoint {
  title: string;
  desc: string;
  badge?: string;
  icon: React.ReactNode;
}

interface TasksFeature {
  title: string;
  desc: string;
  category: string;
  accent: string;
  bullets: BulletPoint[];
  image: string;
}

const TASKS_FEATURES: TasksFeature[] = [
  {
    title: "Sleek Project Management",
    desc: "Create dedicated workspaces for each subject, semester, or major exam. Group your resources, notes, and tasks in structured, distraction-free dashboards. Set high-level research targets and track long-term academic achievements efficiently.",
    category: "Study Projects",
    accent: "#8B5CF6", // Purple
    bullets: [
      {
        title: "Dedicated Course Hubs",
        desc: "Build independent spaces for exams, finals, or individual subjects. Keep your timeline, notes library, and revision schedule isolated and hyper-focused.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2 2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      },
      {
        title: "Linked Study Materials",
        desc: "Attach lecture notes, textbook PDFs, reference web links, and checklists directly into your workspace cards to access resources in one click.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )
      }
    ],
    image: "/landingpage/projects.png",
  },
  {
    title: "Intelligent Task Tracking",
    desc: "Stay organized with our visual Kanban board. Easily prioritize tasks, track progress from 'Not Started' to 'Completed', and set automatic study deadlines. Keep your workflow moving forward and monitor outstanding checklist items easily.",
    category: "Sprint Board",
    accent: "#F43F5E", // Rose
    bullets: [
      {
        title: "Drag & Drop Kanban",
        desc: "Move cards seamlessly across status columns (Not Started, In Progress, Review, Completed) to track your study flow and match your current focus.",
        badge: "Drag",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )
      },
      {
        title: "Deadlines & Milestones",
        desc: "Set target dates and reminders. Get visual status warnings when exam days, homework submissions, or project reviews are approaching.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/tasks.png",
  }
];

export default function TasksScrollingSection() {
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
            Math.floor(progress * TASKS_FEATURES.length),
            TASKS_FEATURES.length - 1
          );
          setActiveFeature(idx);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative w-full bg-white border-t border-black/[0.05]">
      {/* Scroll track */}
      <div ref={sectionRef} className="w-full" style={{ height: `${(TASKS_FEATURES.length * 40) + 100}vh` }}>
        {/* Sticky viewport */}
        <div className="sticky top-0 h-screen flex flex-col md:flex-row items-center px-6 md:px-16 max-w-7xl mx-auto w-full">

          {/* Left Text Column */}
          <div className="w-full md:w-1/2 relative h-[420px] md:h-[530px]">
            {TASKS_FEATURES.map((feature, index) => (
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
                {/* Category & Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <span 
                    className="text-[11px] uppercase tracking-[0.14em] font-bold px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: `${feature.accent}12`, 
                      color: feature.accent 
                    }}
                  >
                    {feature.category}
                  </span>
                  <p className="text-xs text-[#6E6E73] uppercase tracking-[0.12em] font-semibold">Feature 0{index + 1}</p>
                </div>

                {/* Main Headline */}
                <h3 className="text-[28px] md:text-[38px] font-bold text-[#1D1D1F] leading-tight mb-4">{feature.title}</h3>
                
                {/* Description */}
                <p className="text-[14px] md:text-[16px] text-[#6E6E73] leading-relaxed font-medium mb-6 max-w-[460px]">
                  {feature.desc}
                </p>

                {/* Sub Features Bullet List */}
                <div className="flex flex-col gap-4 max-w-[480px]">
                  {feature.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-3.5 bg-black/[0.02] border border-black/[0.04] p-3 rounded-xl hover:bg-black/[0.03] transition-all duration-150">
                      <div 
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
                        style={{ 
                          backgroundColor: `${feature.accent}16`, 
                          color: feature.accent 
                        }}
                      >
                        {bullet.icon}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[14px] font-bold text-[#1D1D1F]">{bullet.title}</h4>
                          {bullet.badge && (
                            <kbd className="px-1.5 py-0.5 text-[9px] font-bold font-sans tracking-wide text-black/70 bg-black/[0.05] border border-black/[0.08] rounded shadow-sm">
                              {bullet.badge}
                            </kbd>
                          )}
                        </div>
                        <p className="text-xs text-[#6E6E73] mt-0.5 leading-relaxed">{bullet.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress Dots */}
                <div className="flex gap-2 mt-8">
                  {TASKS_FEATURES.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === activeFeature ? "w-6 bg-[#E84B1B]" : "w-1.5 bg-black/15"}`} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Image Column */}
          <div className="hidden md:flex w-1/2 items-center justify-center pl-8 h-[500px]">
            <div className="relative w-full h-full rounded-2xl border border-black/[0.08] bg-white shadow-2xl overflow-hidden">
              {TASKS_FEATURES.map((feature, index) => (
                <motion.img
                  key={index}
                  src={feature.image}
                  alt={feature.title}
                  className="absolute w-full h-full object-cover"
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
