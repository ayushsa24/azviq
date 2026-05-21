import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LandingPage from "@/components/LandingPage";

export const metadata = {
  title: "Azviq — AI-Powered Study Workspace",
  description: "Notes, PDFs, AI teacher, and task planner — all in one place. Study smarter with Azviq.",
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Pass the login status directly from the server to prevent any client-side flickering
  return <LandingPage isLoggedIn={!!session} />;
}
