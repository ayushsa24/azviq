"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface BulletPoint {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

interface ChatFeature {
  title: string;
  desc: string;
  category: string;
  accent: string;
  badge?: string;
  bullets: BulletPoint[];
  image: string;
}

const CHAT_FEATURES: ChatFeature[] = [
  {
    title: "New Chat, Fresh Context",
    desc: "Start a clean conversation at any time. Every new chat is fully isolated — your AI starts fresh without any leftover context from previous sessions.",
    category: "Conversations",
    accent: "#3B82F6",
    bullets: [
      {
        title: "Isolated Session Memory",
        desc: "Each chat is its own bubble. Switch topics freely without the AI getting confused by previous conversations.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      },
      {
        title: "Chat History Sidebar",
        desc: "All your past conversations are listed and searchable. Revisit any previous session in one click.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        )
      }
    ],
    image: "/landingpage/chat-new.png",
  },
  {
    title: "Temporary Private Chat",
    desc: "Need a quick, private lookup? Temporary chats are never stored — perfect for sensitive topics, quick calculations, or anything you don't want saved.",
    category: "Privacy",
    accent: "#F59E0B",
    badge: "Temp",
    bullets: [
      {
        title: "Never Saved to History",
        desc: "Temporary sessions vanish the moment you close them. No logs, no traces left behind.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      {
        title: "Instant Disposable Sessions",
        desc: "Start a temp chat from the toolbar in one click. No setup, no naming — just ask and go.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/chat-temp.png",
  },
  {
    title: "Image Upload & Visual Q&A",
    desc: "Snap a photo of a whiteboard, a handwritten equation, or a textbook diagram and drop it into the chat. The AI reads the image and answers your questions instantly.",
    category: "Visual AI",
    accent: "#22C55E",
    bullets: [
      {
        title: "Diagram & Photo Analysis",
        desc: "Upload lecture slides, biology diagrams, or circuit schematics. The AI identifies, labels, and explains every element.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      },
      {
        title: "Handwriting Recognition",
        desc: "Wrote your notes by hand? Photograph them and ask the AI to explain, translate, or expand on what you wrote.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        )
      }
    ],
    image: "/landingpage/chat-image.png",
  },
  {
    title: "Share Chat with Classmates",
    desc: "Found a helpful AI explanation? Share the read-only conversation thread with anyone via a clean, simple link. Perfect for study groups, peer review, and quick references.",
    category: "Sharing",
    accent: "#8B5CF6",
    bullets: [
      {
        title: "One-Click Share Link",
        desc: "Generate a shareable URL for any conversation. Anyone with the link can read the full Q&A thread.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )
      },
      {
        title: "One-Click Import",
        desc: "Anyone with the link can import the shared conversation thread directly into their own workspace with a single click.",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        )
      }
    ],
    image: "/landingpage/chat-share.png",
  },
];

export default function AIChatSection() {
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
            Math.floor(progress * CHAT_FEATURES.length),
            CHAT_FEATURES.length - 1
          );
          setActiveFeature(idx);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section id="ai-chat" className="relative w-full bg-[#F4F4F6]/50 border-t border-black/[0.05]">
      {/* Scroll track */}
      <div ref={sectionRef} className="w-full" style={{ height: `${(CHAT_FEATURES.length * 50) + 100}vh` }}>
        <div className="sticky top-0 h-screen flex flex-col justify-center md:flex-row items-center px-6 md:px-16 max-w-[85rem] mx-auto w-full">

          {/* LEFT — Text + Bullets */}
          <div className="w-full md:w-[35%] relative h-[480px] md:h-[580px]">
            {CHAT_FEATURES.map((f, index) => (
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
                {/* Category badge */}
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="text-[11px] uppercase tracking-[0.14em] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${f.accent}12`, color: f.accent }}
                  >
                    {f.category}
                  </span>
                  {f.badge && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${f.accent}18`, color: f.accent }}
                    >
                      {f.badge}
                    </span>
                  )}
                  <p className="text-xs text-[#6E6E73] uppercase tracking-[0.12em] font-semibold">
                    AI Feature 0{index + 1}
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
                  {CHAT_FEATURES.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === activeFeature ? "w-6 bg-[#E84B1B]" : "w-1.5 bg-black/15"}`} />
                  ))}
                </div>

                {index === CHAT_FEATURES.length - 1 && (
                  <Link
                    href="/signup"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1D1D1F] hover:text-[#3B82F6] transition-colors duration-200"
                  >
                    Try AI Chat free
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                )}
              </motion.div>
            ))}
          </div>

          {/* RIGHT — Animated Mock Image Showcase */}
          <div className="hidden md:flex w-[65%] items-center justify-center pl-12 h-[540px]">
            <div className="relative w-full h-full rounded-2xl border border-black/[0.08] bg-white shadow-2xl overflow-hidden">
              {CHAT_FEATURES.map((feat, index) => (
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
