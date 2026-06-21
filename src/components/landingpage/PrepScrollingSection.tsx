"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface BulletPoint {
  title: string;
  desc: string;
  badge?: string;
  icon: React.ReactNode;
}

interface PrepFeature {
  title: string;
  desc: string;
  category: string;
  accent: string;
  bullets: BulletPoint[];
  image: string;
}

const PREP_FEATURES: PrepFeature[] = [
  {
    title: "Adaptive Practice Exercises",
    desc: "Test your understanding with custom quizzes. Turn your uploaded lecture slides and notes into structured exercises that adapt to your knowledge level. Build confidence by practicing with tailored question banks before your exams.",
    category: "Practice Quiz",
    accent: "#3B82F6", // Blue
    bullets: [
      {
        title: "AI-Generated Quizzes",
        desc: "Convert text or documents into multiple-choice, true/false, or short-answer practice questions instantly based on page details.",
        badge: "AI Quiz",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        )
      },
      {
        title: "Step-by-Step Explanations",
        desc: "Don't just see the score. Get deep contextual feedback explaining the rationale behind every correct and incorrect answer choice.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/prep-exercises.png",
  },
  {
    title: "Smart Revision Tools",
    desc: "Stop passive reading. Use active recall and spaced repetition to lock in core definitions, equations, and formulas right before exams. Automatically optimize review schedules based on cognitive memory retention algorithms.",
    category: "Active Recall",
    accent: "#F59E0B", // Amber
    bullets: [
      {
        title: "Spaced Repetition Cards",
        desc: "Study flashcards generated automatically from your textbook readings, timed perfectly to prevent forgetting and boost long-term retention.",
        badge: "Smart Cards",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      },
      {
        title: "Key-Concept Cheatsheets",
        desc: "Access condensed, high-yield summary guides that distill complex chapters into clear learning bullets and formula lists for fast reviews.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      }
    ],
    image: "/landingpage/prep-revision.png",
  },
  {
    title: "Interactive AI Teacher",
    desc: "Learn directly from your custom study materials. Select specific text, a note page, or a PDF chapter and talk, ask questions, or discuss with the AI. Have a virtual assistant teach you complex slides in real time.",
    category: "AI Tutor",
    accent: "#10B981", // Emerald
    bullets: [
      {
        title: "Contextual PDF & Note Select",
        desc: "Point the AI to the exact paragraph or page block. Keep your conversation focused solely on the selected notes or textbook slide reference.",
        badge: "Selected",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        )
      },
      {
        title: "Conversational Topic Mastery",
        desc: "Ask the AI teacher to explain complex paragraphs, challenge you with flash questions, or test your logic interactively for study review.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/prep-teacher.png",
  }
];

export default function PrepScrollingSection() {
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
            Math.floor(progress * PREP_FEATURES.length),
            PREP_FEATURES.length - 1
          );
          setActiveFeature(idx);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section id="preparation" className="relative w-full bg-[#F4F4F6]/50 border-t border-black/[0.05]">
      {/* Scroll track */}
      <div ref={sectionRef} className="w-full" style={{ height: `${(PREP_FEATURES.length * 50) + 100}vh` }}>
        {/* Sticky viewport */}
        {/* Sticky viewport */}
        <div className="sticky top-0 h-screen flex flex-col justify-center md:flex-row items-center px-6 md:px-16 max-w-[85rem] mx-auto w-full">

          {/* Left Text Column */}
          <div className="w-full md:w-[35%] relative h-[420px] md:h-[530px]">
            {PREP_FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                className="absolute inset-0 flex flex-col justify-center pr-0 md:pr-12"
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
                            <span 
                              className="px-1.5 py-0.5 text-[9px] font-bold tracking-wide rounded"
                              style={{ 
                                backgroundColor: `${feature.accent}18`, 
                                color: feature.accent 
                              }}
                            >
                              {bullet.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6E6E73] mt-0.5 leading-relaxed">{bullet.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress Dots */}
                <div className="flex gap-2 mt-8">
                  {PREP_FEATURES.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === activeFeature ? "w-6 bg-[#E84B1B]" : "w-1.5 bg-black/15"}`} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Image Column */}
          <div className="hidden md:flex w-[65%] items-center justify-center pl-12 h-[540px]">
            <div className="relative w-full h-full rounded-2xl border border-black/[0.08] bg-white shadow-2xl overflow-hidden">
              {PREP_FEATURES.map((feature, index) => (
                <motion.img
                  key={index}
                  src={feature.image}
                  alt={feature.title}
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
