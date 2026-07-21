"use client";
import Navbar from "./landingpage/Navbar";
import HeroSection from "./landingpage/HeroSection";
import DashboardShowcaseSection from "./landingpage/DashboardShowcaseSection";
import FeaturesBento from "./landingpage/FeaturesBento";
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

      {/* FEATURES GRID */}
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
