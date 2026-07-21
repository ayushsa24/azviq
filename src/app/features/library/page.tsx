import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/landingpage/Navbar";
import Footer from "@/components/landingpage/Footer";
import ScrollingFeaturesSection from "@/components/landingpage/ScrollingFeaturesSection";

export const metadata = {
  title: "Library Feature — Azviq",
  description: "Store notes, PDFs, external workspaces and study materials — completely organized.",
};

export default async function LibraryFeaturePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#1D1D1F]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Navbar isLoggedIn={!!session} />
      
      <main className="pt-24 pb-12">
        <ScrollingFeaturesSection />
      </main>

      <Footer />
    </div>
  );
}
