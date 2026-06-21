import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AboutPage from "@/components/AboutPage";

export const metadata = {
  title: "About Us — Azviq",
  description: "Learn about Azviq's mission to redefine how the world learns and studies with AI.",
};

export default async function About() {
  const session = await getServerSession(authOptions);

  return <AboutPage isLoggedIn={!!session} />;
}
