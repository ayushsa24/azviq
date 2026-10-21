import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TermsPage from "@/components/TermsPage";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Terms of Service governing your use of Azviq.",
  alternates: {
    canonical: "/terms",
  },
};

export default async function Terms() {
  const session = await getServerSession(authOptions);

  return <TermsPage isLoggedIn={!!session} />;
}
