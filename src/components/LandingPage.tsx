"use client";
import Navbar from "./landingpage/Navbar";
import HeroSection from "./landingpage/HeroSection";
import DashboardShowcaseSection from "./landingpage/DashboardShowcaseSection";
import DashboardScrollingSection from "./landingpage/DashboardScrollingSection";
import ScrollingFeaturesSection from "./landingpage/ScrollingFeaturesSection";
import TasksScrollingSection from "./landingpage/TasksScrollingSection";
import PrepScrollingSection from "./landingpage/PrepScrollingSection";
import DataControlSection from "./landingpage/DataControlSection";
import ParentControlSection from "./landingpage/ParentControlSection";
import FeaturesBento from "./landingpage/FeaturesBento";
import AIChatSection from "./landingpage/AIChatSection";
import PricingSection from "./landingpage/PricingSection";
import FaqSection from "./landingpage/FaqSection";
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

      {/* DASHBOARD SCROLLING FEATURES */}
      <DashboardScrollingSection />

      {/* SCROLLING FEATURES SECTION */}
      <ScrollingFeaturesSection />

      {/* FEATURE DEEP DIVE A — AI CHAT (sticky scroll, below Library) */}
      <AIChatSection />

      {/* TASKS SCROLLING FEATURES SECTION */}
      <TasksScrollingSection />

      {/* PREPARATION SCROLLING FEATURES SECTION */}
      <PrepScrollingSection />

      {/* DATA CONTROL & PRIVACY SECTION */}
      <DataControlSection />

      {/* PARENTAL CONTROL SECTION */}
      <ParentControlSection />

      {/* FEATURES BENTO */}
      <FeaturesBento />

      {/* PRICING SECTION */}
      <PricingSection />

      {/* FAQ SECTION */}
      <FaqSection />

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
