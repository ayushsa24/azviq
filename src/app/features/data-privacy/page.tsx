import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/landingpage/Navbar";
import Footer from "@/components/landingpage/Footer";
import DataControlSection from "@/components/landingpage/DataControlSection";

export const metadata = {
  title: "Data Privacy — Azviq",
  description: "Total control over your data. Permanently delete anything you want, anytime, with zero recovery.",
};

export default async function DataPrivacyPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#1D1D1F]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Navbar isLoggedIn={!!session} />
      
      <main className="pt-24 pb-12">
        <DataControlSection />
      </main>

      <Footer />
    </div>
  );
}
