import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/landingpage/Navbar";
import Footer from "@/components/landingpage/Footer";
import AIChatSection from "@/components/landingpage/AIChatSection";

export const metadata = {
  title: "AI Chat Feature — Azviq",
  description: "Chat with an AI that understands your note pages, files, and lectures.",
};

export default async function AIChatFeaturePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#1D1D1F]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Navbar isLoggedIn={!!session} />
      
      <main className="pt-24 pb-12">
        <AIChatSection />
      </main>

      <Footer />
    </div>
  );
}
