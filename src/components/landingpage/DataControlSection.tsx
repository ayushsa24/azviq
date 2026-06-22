"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface BulletPoint {
  title: string;
  desc: string;
  actionText?: string;
  icon: React.ReactNode;
}

interface ControlFeature {
  title: string;
  desc: string;
  category: string;
  accent: string;
  bullets: BulletPoint[];
  image: string;
}

const CONTROL_FEATURES: ControlFeature[] = [
  {
    title: "Shared Link Access Control",
    desc: "Audit, review, and revoke access permissions for public chat threads and note files instantly to protect your academic property. Restrict link availability and ensure shared materials are only accessible by authorized peers.",
    category: "Shared Links",
    accent: "#3B82F6", // Blue
    bullets: [
      {
        title: "Chat Shared Links",
        desc: "Audit active web links generated for your chats. Instantly revoke shared public URLs for your AI conversation history to disable browser access.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )
      },
      {
        title: "Note Shared Links",
        desc: "Monitor password protections, expiration dates, and edit permissions for collaborative student notebook sheets and documentation folders.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/control-shared.png",
  },
  {
    title: "Imported Files & Chats",
    desc: "Control materials synchronized from external note-taking tools, document repositories, and PDF libraries. Keep your primary folders clean and free of redundant draft pages or duplicate uploads.",
    category: "Imports",
    accent: "#F59E0B", // Amber
    bullets: [
      {
        title: "Imported Chats History",
        desc: "Review or delete raw prompt datasets, markdown logs, and history files imported from secondary study workspaces and external platforms.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
          </svg>
        )
      },
      {
        title: "Imported Notes Archive",
        desc: "Purge heavy textbooks, slide resources, scanned PDFs, and imported text pages transferred into your cloud and local storage database.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/control-imported.png",
  },
  {
    title: "Archive Workspace Dialogs",
    desc: "Hide inactive threads from your central sidebar list or run bulk operations to reset your focus area. Archiving allows you to clean up old courses while retaining reviewable data for exam prep.",
    category: "Archive",
    accent: "#E84B1B", // Orange/Rose
    bullets: [
      {
        title: "Archived Chats Dashboard",
        desc: "Access previous AI conversation topics that you marked as resolved or chose to temporarily hide from the active workspace sidebar view.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        )
      },
      {
        title: "Archive All Chats",
        desc: "Reset active study sessions instantly by archiving all existing conversation tabs, letting you start new school semesters with a clean slate.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v12m0 0l-3-3m3 3l3-3m8-8v12m0 0l-3-3m3 3l3-3" />
          </svg>
        )
      }
    ],
    image: "/landingpage/control-archived.png",
  },
  {
    title: "Permanent Storage Erasure",
    desc: "Wipe sensitive files, delete old study records, and clean local device caches forever. We guarantee direct disk-level purging for deleted data to honor privacy regulations.",
    category: "Deletion",
    accent: "#10B981", // Emerald
    bullets: [
      {
        title: "Delete Archived Chats",
        desc: "Permanently erase all archived discussion threads from our secure databases. This action is irreversible and immediately wipes all metadata logs.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )
      }
    ],
    image: "/landingpage/control-delete.png",
  }
];

export default function DataControlSection() {
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
            Math.floor(progress * CONTROL_FEATURES.length),
            CONTROL_FEATURES.length - 1
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
      <div ref={sectionRef} className="w-full" style={{ height: `${(CONTROL_FEATURES.length * 50) + 100}vh` }}>
        <div className="sticky top-0 h-screen flex flex-col justify-center md:flex-row items-center px-6 md:px-16 max-w-7xl mx-auto w-full">

          {/* LEFT — Text + Bullets */}
          <div className="w-full md:w-[42%] relative h-[480px] md:h-[580px]">
            {CONTROL_FEATURES.map((f, index) => (
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
                    Data Control 0{index + 1}
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
                    <div key={bIdx} className="flex items-center gap-3.5 bg-black/[0.02] border border-black/[0.04] p-3.5 rounded-xl hover:bg-black/[0.03] transition-all duration-150">
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
                  {CONTROL_FEATURES.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === activeFeature ? "w-6 bg-[#E84B1B]" : "w-1.5 bg-black/15"}`} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* RIGHT — Animated Image Showcase */}
          <div className="hidden md:flex w-full md:w-[58%] items-center justify-center pl-8 md:pl-12 h-[500px]">
            <div className="relative w-full h-full rounded-2xl border border-black/[0.08] bg-white shadow-2xl overflow-hidden">
              {CONTROL_FEATURES.map((feat, index) => (
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
