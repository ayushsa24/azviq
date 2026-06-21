"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface BulletPoint {
  title: string;
  desc: string;
  badge?: string;
  icon: React.ReactNode;
}

interface StickyFeature {
  title: string;
  desc: string;
  category: string;
  accent: string;
  bullets: BulletPoint[];
  image: string;
}

const STICKY_FEATURES: StickyFeature[] = [
  {
    title: "Your Complete Study Library",
    desc: "A centralized hub for all your academic resources. Organize your semesters, subjects, and study materials in one intuitive, unified space. Keep track of lecture handouts, syllabus sheets, and dynamic resources with an automated classification system.",
    category: "Workspace",
    accent: "#3B82F6", // Blue
    bullets: [
      {
        title: "Smart Semester Folders",
        desc: "Group notes, quizzes, and tasks by class, major topic, or exam. Keep all related files clustered together so you never lose track of your resources throughout the semester.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        )
      },
      {
        title: "Instant Access Sidebar",
        desc: "Pin active courses and revision modules for one-click access. Navigate through extensive directories and files instantly without complex path search steps.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/library.png",
  },
  {
    title: "AI-Powered Notes",
    desc: "Take smart notes that understand your context. Generate summaries, ask questions directly from your notes, and turn concepts into flashcards instantly. Real-time editor features allow you to construct study documents with continuous AI assistance.",
    category: "Smart Editor",
    accent: "#E84B1B", // Orange/Red
    bullets: [
      {
        title: "Press Space for AI",
        desc: "Summon the AI assistant on a new line to write, edit, or brainstorm. It reads the whole page's context to draft text in your writing style, continuing arguments or introducing examples.",
        badge: "Space",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      },
      {
        title: "Smart Selection Menu",
        desc: "Highlight text to instantly Summarize dense content, Explain complex concepts, or Simplify academic jargon into clear, plain language without changing tabs.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
          </svg>
        )
      }
    ],
    image: "/landingpage/notes.png",
  },
  {
    title: "Interactive PDF Reader",
    desc: "Read, annotate, and mark up your study materials directly inside the app. Highlight key paragraphs, sketch on diagrams, and add comment boxes on lecture notes, research papers, or textbooks to enhance your learning experience.",
    category: "Active Reading",
    accent: "#22C55E", // Green
    bullets: [
      {
        title: "Draw & Markup Canvas",
        desc: "Draw custom arrows, highlight diagrams, sketch visual shapes, and scribble hand-written annotations directly onto lecture slides and textbook layouts.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        )
      },
      {
        title: "Highlight & Text Overlay",
        desc: "Color-code key terms with multiple highlighter shades, and overlay text comment boxes directly onto complex textbook diagrams for easy review later.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.242 21.758a2.5 2.5 0 01-3.536 0l-7.07-7.07a2.5 2.5 0 010-3.536l1.414-1.414 10.606 10.606-1.414 1.414z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3h2M12 3v4" />
          </svg>
        )
      }
    ],
    image: "/landingpage/pdf.png",
  }
];

export default function ScrollingFeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(0);
  const featureSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (featureSectionRef.current) {
        const rect = featureSectionRef.current.getBoundingClientRect();
        const sectionHeight = featureSectionRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;
        const scrolledIntoSection = -rect.top;
        if (scrolledIntoSection >= 0) {
          const scrollableDistance = sectionHeight - viewportHeight;
          const progress = Math.max(0, Math.min(1, scrolledIntoSection / (scrollableDistance || 1)));
          const idx = Math.min(
            Math.floor(progress * STICKY_FEATURES.length),
            STICKY_FEATURES.length - 1
          );
          setActiveFeature(idx);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section id="library" className="relative w-full bg-white border-t border-black/[0.05]">
      {/* Scroll track */}
      <div ref={featureSectionRef} className="w-full" style={{ height: `${(STICKY_FEATURES.length * 50) + 100}vh` }}>
        {/* Sticky viewport */}
        <div className="sticky top-0 h-screen flex flex-col justify-center md:flex-row items-center px-6 md:px-16 max-w-[85rem] mx-auto w-full">

          {/* Left Text Column */}
          <div className="w-full md:w-[35%] relative h-[420px] md:h-[530px]">
            {STICKY_FEATURES.map((feature, index) => (
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
                  {STICKY_FEATURES.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === activeFeature ? "w-6 bg-[#E84B1B]" : "w-1.5 bg-black/15"}`} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Image Column */}
          <div className="hidden md:flex w-[65%] items-center justify-center pl-12 h-[540px]">
            <div className="relative w-full h-full rounded-2xl border border-black/[0.08] bg-[#F4F4F6] shadow-2xl overflow-hidden">
              {STICKY_FEATURES.map((feature, index) => (
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
