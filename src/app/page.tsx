import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LandingPage from "@/components/LandingPage";
import type { Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: { absolute: "Azviq — AI-Powered Study Workspace" },
  description: "Notes, PDFs, AI teacher, and task planner — all in one place. Study smarter with Azviq.",
};

// Adds <meta name="color-scheme" content="light"> only on the landing page.
// This prevents Google Search's in-app browser from force-applying dark mode
// before JavaScript runs. Has zero effect on Safari, Chrome, or any other page.
export const viewport: Viewport = {
  colorScheme: "light",
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Detect if the request is coming from the native Capacitor app
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const isCapacitor = userAgent.includes("AzviqCapacitorApp");

  if (isCapacitor) {
    if (session) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  }

  // Pass the login status directly from the server to prevent any client-side flickering
  return <LandingPage isLoggedIn={!!session} />;
}
