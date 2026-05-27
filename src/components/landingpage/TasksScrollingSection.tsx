"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const TASKS_FEATURES = [
  {
    title: "Sleek Project Management",
    desc: "Create dedicated workspaces for each subject, semester, or major exam. Group your resources, notes, and tasks in structured, distraction-free dashboards.",
    image: "/landingpage/projects.png",
  },
  {
    title: "Intelligent Task Tracking",
    desc: "Stay organized with our visual Kanban board. Easily prioritize tasks, track progress from 'Not Started' to 'Completed', and set automatic study deadlines.",
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
        const panelHeight = (sectionHeight - viewportHeight) / TASKS_FEATURES.length;
        if (scrolledIntoSection >= 0) {
          const idx = Math.min(
            Math.floor(scrolledIntoSection / panelHeight),
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
    <section ref={sectionRef} className="relative w-full bg-[#F4F4F6]/50 border-t border-black/[0.05]">
      {/* Tall scroll track: 100vh per feature + 1 screen to start */}
      <div className="h-[300vh] w-full">
        {/* Sticky viewport */}
        <div className="sticky top-0 h-screen flex flex-col md:flex-row items-center px-6 md:px-16 max-w-7xl mx-auto w-full">

          {/* Left Text Column */}
          <div className="w-full md:w-1/2 relative h-[300px] md:h-[400px]">
            {TASKS_FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                className="absolute inset-0 flex flex-col justify-center pr-0 md:pr-20"
                animate={{
                  opacity: activeFeature === index ? 1 : 0,
                  y: activeFeature === index ? 0 : (index > activeFeature ? 32 : -32),
                }}
                transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="flex flex-col gap-1 mb-4">
                  <span className="text-[11px] text-[#6E6E73] uppercase tracking-[0.14em] font-bold">Task Features</span>
                  <p className="text-xs text-[#E84B1B] uppercase tracking-[0.12em] font-semibold">Feature 0{index + 1}</p>
                </div>
                <h3 className="text-[30px] md:text-[42px] font-bold text-[#1D1D1F] leading-tight mb-5">{feature.title}</h3>
                <p className="text-[15px] md:text-[17px] text-[#6E6E73] leading-relaxed font-medium max-w-[460px]">{feature.desc}</p>
                {/* Progress dots */}
                <div className="flex gap-2 mt-10">
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
