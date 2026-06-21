"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHandPressed, setIsHandPressed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      setMousePos({ x, y });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const parallaxX = mousePos.x * -20;
  const parallaxY = mousePos.y * -20;

  return (
    <>
      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex flex-col items-center pt-0 pb-20 overflow-hidden">
        {/* Keyboard Left (Parallax Animated) */}
        <motion.div
          className="absolute left-[-35px] md:left-[-45px] lg:left-[-45px] top-[25%] w-[180px] md:w-[260px] lg:w-[320px] pointer-events-none z-10 hidden md:block"
          animate={{ x: parallaxX, y: parallaxY }}
          transition={{ type: "spring", stiffness: 45, damping: 25 }}
        >
          <img 
            src="/landingpage/keyboard.PNG" 
            alt="keyboard desk setup" 
            className="w-full h-auto rotate-[-8deg]" 
            style={{ filter: "drop-shadow(10px 20px 30px rgba(0, 0, 0, 0.15))" }}
          />
        </motion.div>

        {/* Book/Glasses Right (Parallax Animated) */}
        <motion.div
          className="absolute right-[-20px] md:right-[-25px] lg:right-[-30px] top-[25%] w-[180px] md:w-[260px] lg:w-[320px] pointer-events-none z-10 hidden md:block"
          animate={{ x: -parallaxX, y: -parallaxY }}
          transition={{ type: "spring", stiffness: 45, damping: 25 }}
        >
          <img 
            src="/landingpage/book.PNG" 
            alt="book glasses desk setup" 
            className="w-full h-auto rotate-[8deg]" 
            style={{ filter: "drop-shadow(-10px 20px 30px rgba(0, 0, 0, 0.15))" }}
          />
        </motion.div>

        {/* Cable Bottom-Left */}
        <motion.div
          className="absolute left-[-5px] md:left-[-16px] lg:left-[-25px] top-[64%] md:top-[74%] lg:top-[80%] w-[100px] md:w-[140px] lg:w-[170px] pointer-events-none z-10 hidden md:block"
          animate={{ x: parallaxX, y: parallaxY }}
          transition={{ type: "spring", stiffness: 45, damping: 25 }}
        >
          <img 
            src="/landingpage/cabel.PNG" 
            alt="wire cable desk setup" 
            className="w-full h-auto rotate-[-10deg]" 
            style={{ filter: "drop-shadow(8px 16px 20px rgba(0, 0, 0, 0.18))" }}
          />
        </motion.div>

        {/* Reaching Hand */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] md:w-[360px] lg:w-[430px] pointer-events-none z-30"
          animate={{
            y: isHandPressed ? 20 : [0, -8, 0],
            opacity: scrolled ? 0 : 1
          }}
          transition={{
            y: isHandPressed ? { type: "spring", stiffness: 200, damping: 15 } : { repeat: Infinity, duration: 6, ease: "easeInOut" },
            opacity: { duration: 0.3 }
          }}
        >
          <img 
            src="/landingpage/hand.PNG" 
            alt="hand pointing down" 
            className="w-full h-auto" 
            style={{ 
              filter: "drop-shadow(0px 20px 40px rgba(0, 0, 0, 0.18))",
              maskImage: "linear-gradient(to bottom, transparent, black 18%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 18%)"
            }}
          />
        </motion.div>

        {/* Main Center Flow */}
        <div className="relative z-20 flex flex-col items-center text-center px-6 w-full max-w-3xl pt-[140px] md:pt-[190px] lg:pt-[240px]">
          {/* Orange Get Started Button */}
          <div className="flex justify-center z-40 mb-4">
            <Link
              href="/signup"
              className="bg-[#E84B1B] text-white font-bold px-7 py-3 rounded-md text-[13px] hover:bg-[#d63f14] transition-all hover:scale-105 shadow-xl uppercase tracking-wider"
              onMouseEnter={() => setIsHandPressed(true)}
              onMouseLeave={() => setIsHandPressed(false)}
            >
              Get Started
            </Link>
          </div>

          {/* Center Image */}
          <div className="relative w-[320px] md:w-[480px] lg:w-[560px] z-20 mb-5">
            <img 
              src="/landingpage/center.PNG" 
              alt="Azviq Device Center" 
              className="w-full h-auto" 
              style={{ filter: "drop-shadow(10px 15px 12px rgba(0, 0, 0, 0.24)) drop-shadow(30px 40px 30px rgba(0, 0, 0, 0.18))" }}
            />
          </div>

          {/* Text Content */}
          <div className="mb-10 max-w-2xl mx-auto">
            <h1 className="text-[32px] md:text-[42px] font-extrabold leading-[1.15] mb-4 tracking-tight text-[#1D1D1F]">
              Your Ultimate AI Study Workspace
            </h1>
            <p className="text-[14px] md:text-[16px] text-[#6E6E73] max-w-[580px] mx-auto leading-relaxed font-medium">
              Azviq is an all-in-one platform featuring <span className="text-[#1D1D1F] font-semibold">AI-powered note-taking</span>, smart <span className="text-[#1D1D1F] font-semibold">task tracking</span>, instant <span className="text-[#1D1D1F] font-semibold">quiz generation</span>, and automated <span className="text-[#1D1D1F] font-semibold">revision schedules</span>. Everything you need to master your studies, in one unified desk workspace.
            </p>
          </div>
        </div>
      </section>

      {/* 3-COLUMN FEATURES BAR */}
      <div className="w-full bg-[#EAEAEF] border-y border-black/[0.05] py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:divide-x md:divide-black/10">
          <div className="text-left md:pr-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">⏱️</span>
              <h4 className="font-bold text-[#1D1D1F] text-[15px]">Productivity companion</h4>
            </div>
            <p className="text-[13px] text-[#6E6E73] leading-relaxed font-normal">Time management apps, custom study message, Pomodoro focus timer.</p>
          </div>
          <div className="text-left md:px-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">⚡</span>
              <h4 className="font-bold text-[#1D1D1F] text-[15px]">AI & Integration</h4>
            </div>
            <p className="text-[13px] text-[#6E6E73] leading-relaxed font-normal">Personal AI study librarian, connection to PDFs and notes, integrations with calendar events.</p>
          </div>
          <div className="text-left md:pl-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">⚙️</span>
              <h4 className="font-bold text-[#1D1D1F] text-[15px]">Student friendly</h4>
            </div>
            <p className="text-[13px] text-[#6E6E73] leading-relaxed font-normal">Open dashboard, heatmap tracking, simple visual stats, no vendor lock-in.</p>
          </div>
        </div>
      </div>
    </>
  );
}
