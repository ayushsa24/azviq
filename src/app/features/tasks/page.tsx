import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/landingpage/Navbar";
import Footer from "@/components/landingpage/Footer";
import TasksScrollingSection from "@/components/landingpage/TasksScrollingSection";

export const metadata = {
  title: "Tasks Feature — Azviq",
  description: "Sleek Kanban boards for your active projects. Track progress easily.",
};

export default async function TasksFeaturePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-[#1D1D1F]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Navbar isLoggedIn={!!session} />
      
      <main className="pt-24 pb-12">
        <TasksScrollingSection />
      </main>

      <Footer />
    </div>
  );
}
