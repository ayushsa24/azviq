import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ContactPage from "@/components/ContactPage";

export const metadata = {
  title: "Contact Us",
  description: "Get in touch with the Azviq team for support, feedback, or general inquiries.",
};

export default async function Contact() {
  const session = await getServerSession(authOptions);

  return <ContactPage isLoggedIn={!!session} />;
}
