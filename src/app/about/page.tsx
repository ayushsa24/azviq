import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AboutPage from "@/components/AboutPage";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Azviq's mission to redefine how the world learns and studies with AI.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Us — Azviq",
    description: "Learn about Azviq's mission to redefine how the world learns and studies with AI.",
    url: "https://azviq.in/about",
    siteName: "Azviq",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/azviq_logo.png",
        width: 1200,
        height: 630,
        alt: "Azviq — AI-Powered Study Companion",
      },
    ],
  },
};

export default async function About() {
  const session = await getServerSession(authOptions);

  return <AboutPage isLoggedIn={!!session} />;
}
