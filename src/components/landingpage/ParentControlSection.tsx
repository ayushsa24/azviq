"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface BulletPoint {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

interface ParentFeature {
  title: string;
  desc: string;
  category: string;
  accent: string;
  bullets: BulletPoint[];
  image: string;
}

const PARENT_FEATURES: ParentFeature[] = [
  {
    title: "Family Members & Daily Reports",
    desc: "Keep everyone in the loop. Register guardian email addresses to automatically send detailed performance updates every evening. Parents and educators can stay informed on quiz performance, completed notes, and focus durations without interfering with study flow.",
    category: "Family Hub",
    accent: "#3B82F6", // Blue
    bullets: [
      {
        title: "Registered Recipients",
        desc: "Configure designated family email accounts. Registered members receive study summaries and achievement reports automatically every evening.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      },
      {
        title: "Guardian Management",
        desc: "Easily add new guardian, tutor, or counselor emails to the list to receive child activity metrics and feedback reports automatically.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/parental-family.png",
  },
  {
    title: "Restricted AI Content",
    desc: "Ensure a safe learning environment. Filter AI teacher queries and note completions for younger age groups. Our safety filters block non-academic content and restrict explanations to student-friendly languages.",
    category: "Safety Filters",
    accent: "#EF4444", // Red
    bullets: [
      {
        title: "Content Moderation Filters",
        desc: "Automatically filter notes text, chat responses, and practice questions to provide age-appropriate explanations and textbook help.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      },
      {
        title: "Focus Preservation Modes",
        desc: "Block casual chat topics and non-educational prompt threads to keep the AI teacher sessions centered entirely on active study materials.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        )
      }
    ],
    image: "/landingpage/parental-family.png",
  },
  {
    title: "Daily Study Target",
    desc: "Help your child build consistent study schedules. Set target focus durations tracked directly on consistency graphs. Give students clear milestones to hit every day to establish productive habits.",
    category: "Targets",
    accent: "#F59E0B", // Amber
    bullets: [
      {
        title: "Minimum Target Duration",
        desc: "Configure minimum target study durations (e.g., 2 hrs/day) to guide daily focus times and track completion on consistency boards.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      {
        title: "Consistency Mapping",
        desc: "Compare daily target goals against actual study hours in the consistency graphs, showing completed streaks and focus records.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/parental-family.png",
  },
  {
    title: "Report Delivery & Schedule",
    desc: "Every day at 8:00 PM IST, added family members receive an automated email summarizing daily progress metrics. Keep progress reports predictable and scheduled.",
    category: "Scheduling",
    accent: "#10B981", // Emerald
    bullets: [
      {
        title: "Report Delivery Time",
        desc: "Schedule daily email delivery schedules. Defaults to 8:00 PM IST to review study consistency metrics during family discussions.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      },
      {
        title: "Performance Summaries",
        desc: "Sent emails aggregate completed quiz scores, note creation counts, active Pomodoro study time, and identified weak topic warning summaries.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/parental-family.png",
  }
];

export default function ParentControlSection() {
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
            Math.floor(progress * PARENT_FEATURES.length),
            PARENT_FEATURES.length - 1
          );
          setActiveFeature(idx);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative w-full bg-[#F4F4F6]/50 border-t border-black/[0.05]">
      {/* Scroll track */}
      <div ref={sectionRef} className="w-full" style={{ height: `${(PARENT_FEATURES.length * 50) + 100}vh` }}>
        <div className="sticky top-0 h-screen flex flex-col justify-center md:flex-row items-center px-6 md:px-16 max-w-7xl mx-auto w-full">

          {/* LEFT — Text + Bullets */}
          <div className="w-full md:w-[42%] relative h-[480px] md:h-[580px]">
            {PARENT_FEATURES.map((f, index) => (
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
                    Parental Mode 0{index + 1}
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
                    <div key={bIdx} className="flex items-center gap-3.5 bg-white border border-black/[0.04] p-3.5 rounded-xl hover:bg-black/[0.02] transition-all duration-150 shadow-sm">
                      <div
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg mt-0.5"
                        style={{ backgroundColor: `${f.accent}16`, color: f.accent }}
                      >
                        {b.icon}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[#1D1D1F]">{b.title}</h4>
                        <p className="text-xs text-[#6E6E73] mt-0.5 leading-relaxed max-w-[340px]">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress dots */}
                <div className="flex gap-2 mt-8">
                  {PARENT_FEATURES.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === activeFeature ? "w-6 bg-[#E84B1B]" : "w-1.5 bg-black/15"}`} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* RIGHT — Animated Image Showcase */}
          <div className="hidden md:flex w-full md:w-[58%] items-center justify-center pl-8 md:pl-12 h-[500px]">
            <div className="relative w-full h-full rounded-2xl border border-black/[0.08] bg-white shadow-2xl overflow-hidden">
              {PARENT_FEATURES.map((feat, index) => (
                <motion.div
                  key={index}
                  className="absolute inset-0"
                  animate={{
                    opacity: activeFeature === index ? 1 : 0,
                    scale: activeFeature === index ? 1 : 1.04,
                  }}
                  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <Image
                    src={feat.image}
                    alt={feat.title}
                    fill
                    className="object-cover"
                  />
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
