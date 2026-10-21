import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PrivacyPolicyPage from "@/components/PrivacyPolicyPage";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how Azviq collects, uses, and protects your personal data.",
  alternates: {
    canonical: "/privacy",
  },
};

export default async function Privacy() {
  const session = await getServerSession(authOptions);

  return <PrivacyPolicyPage isLoggedIn={!!session} />;
}
