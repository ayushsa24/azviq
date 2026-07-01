import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LandingPage from "@/components/LandingPage";
import type { Viewport } from "next";

// Tells Google Search in-app browser (and other WebViews) not to
// force dark mode on the landing page before JavaScript runs.
// Safari and Chrome are unaffected — ThemeContext JS already handles them.
export const viewport: Viewport = {
  colorScheme: "light",
};

export const metadata = {
  title: { absolute: "Azviq — AI-Powered Study Workspace" },
  description: "Notes, PDFs, AI teacher, and task planner — all in one place. Study smarter with Azviq.",
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Pass the login status directly from the server to prevent any client-side flickering
  return <LandingPage isLoggedIn={!!session} />;
}
