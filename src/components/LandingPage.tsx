"use client";
import Navbar from "./landingpage/Navbar";
import HeroSection from "./landingpage/HeroSection";
import DashboardShowcaseSection from "./landingpage/DashboardShowcaseSection";
import ScrollingFeaturesSection from "./landingpage/ScrollingFeaturesSection";
import TasksScrollingSection from "./landingpage/TasksScrollingSection";
import FeaturesBento from "./landingpage/FeaturesBento";
import AIChatSection from "./landingpage/AIChatSection";
import FinalCTA from "./landingpage/FinalCTA";
import Footer from "./landingpage/Footer";

interface Props {
  isLoggedIn?: boolean;
}

export default function LandingPage({ isLoggedIn = false }: Props) {
  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#1D1D1F]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      
      {/* NAVBAR */}
      <Navbar isLoggedIn={isLoggedIn} />

      {/* HERO & 3-COLUMN FEATURES BAR */}
      <HeroSection />

      {/* DASHBOARD SHOWCASE SECTION */}
      <DashboardShowcaseSection />

      {/* SCROLLING FEATURES SECTION */}
      <ScrollingFeaturesSection />

      {/* TASKS SCROLLING FEATURES SECTION */}
      <TasksScrollingSection />

      {/* FEATURES BENTO */}
      <FeaturesBento />

      {/* FEATURE DEEP DIVE A — AI CHAT */}
      <AIChatSection />

      {/* FINAL CTA */}
      <FinalCTA />

      {/* FOOTER */}
      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
}
