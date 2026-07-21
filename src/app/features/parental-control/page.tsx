import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/landingpage/Navbar";
import Footer from "@/components/landingpage/Footer";
import ParentControlSection from "@/components/landingpage/ParentControlSection";

export const metadata = {
  title: "Family & Reports — Azviq",
  description: "Keep family in the loop with automated daily study reports and progress tracking.",
};

export default async function ParentalControlPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#1D1D1F]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Navbar isLoggedIn={!!session} />
      
      <main className="pt-24 pb-12">
        <ParentControlSection />
      </main>

      <Footer />
    </div>
  );
}
