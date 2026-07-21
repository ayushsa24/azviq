import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/landingpage/Navbar";
import Footer from "@/components/landingpage/Footer";
import DashboardScrollingSection from "@/components/landingpage/DashboardScrollingSection";

export const metadata = {
  title: "Dashboard Feature — Azviq",
  description: "See your study time, due tasks, revision schedule, and AI suggestions at a glance.",
};

export default async function DashboardFeaturePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#1D1D1F]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Navbar isLoggedIn={!!session} />
      
      <main className="pt-24 pb-12">
        <DashboardScrollingSection />
      </main>

      <Footer />
    </div>
  );
}
