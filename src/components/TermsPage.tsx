"use client";
import Navbar from "./landingpage/Navbar";
import Footer from "./landingpage/Footer";
import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "description", title: "2. Description of Service" },
  { id: "accounts", title: "3. User Accounts & Security" },
  { id: "ai-usage", title: "4. Acceptable AI Usage" },
  { id: "payments", title: "5. Subscriptions & Payments" },
  { id: "intellectual-property", title: "6. Intellectual Property" },
  { id: "termination", title: "7. Termination" },
  { id: "liability", title: "8. Limitation of Liability" },
  { id: "changes", title: "9. Changes to Terms" },
  { id: "contact", title: "10. Contact Us" },
];

export default function TermsPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [activeSection, setActiveSection] = useState("acceptance");

  // Update active section based on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = SECTIONS.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 200; // Offset for sticky header

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 120,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#1D1D1F] selection:bg-[#E84B1B]/20 selection:text-[#E84B1B] overflow-x-hidden">
      <Navbar isLoggedIn={isLoggedIn} />

      {/* Header */}
      <section className="pt-[140px] md:pt-[180px] pb-12 px-6 bg-[#F4F4F6]/50 border-b border-black/[0.05]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-[36px] md:text-[52px] font-extrabold tracking-tight text-[#1D1D1F] mb-4 leading-tight">
            Terms of Service
          </h1>
          <p className="text-[15px] md:text-[16px] text-[#6E6E73] font-medium">
            Effective Date: June 21, 2026 <br className="md:hidden" />
            <span className="hidden md:inline"> • </span> Last Updated: June 21, 2026
          </p>
        </div>
      </section>

      {/* Content Layout */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 md:gap-24 relative items-start">
          
          {/* Sidebar Navigation (Sticky on Desktop) */}
          <div className="hidden md:block w-[280px] flex-shrink-0 sticky top-[120px]">
            <p className="text-[12px] font-bold text-[#88888F] uppercase tracking-widest mb-6">Table of Contents</p>
            <nav className="flex flex-col gap-3 border-l border-black/[0.06] pl-4">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`text-left text-[14px] transition-all duration-200 ${
                    activeSection === section.id 
                      ? "text-[#E84B1B] font-bold translate-x-1" 
                      : "text-[#6E6E73] font-medium hover:text-[#1D1D1F] hover:translate-x-1"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content Terms Text */}
          <div className="w-full max-w-3xl prose prose-gray prose-headings:font-bold prose-h2:text-[24px] prose-h2:text-[#1D1D1F] prose-h2:mt-12 prose-h2:mb-6 prose-h2:tracking-tight prose-p:text-[15px] prose-p:text-[#545454] prose-p:leading-relaxed prose-p:mb-6 prose-li:text-[15px] prose-li:text-[#545454] prose-a:text-[#E84B1B] prose-a:no-underline hover:prose-a:underline">
            
            <div id="acceptance" className="scroll-mt-[140px]">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using the Azviq application, website, and related services (the "Services"), you agree to be bound by these Terms of Service. If you do not agree to these Terms, you may not access or use the Services.
              </p>
              <p>
                If you are using the Services on behalf of an organization or educational institution, you are agreeing to these Terms for that organization and representing that you have the authority to bind that organization to these Terms.
              </p>
            </div>

            <div id="description" className="scroll-mt-[140px]">
              <h2>2. Description of Service</h2>
              <p>
                Azviq provides an AI-powered study platform that allows users to upload educational materials (like PDFs and notes), interact with an AI Teacher, manage tasks, and track study progress. We reserve the right to modify, suspend, or discontinue any part of the Services at any time without notice.
              </p>
            </div>

            <div id="accounts" className="scroll-mt-[140px]">
              <h2>3. User Accounts & Security</h2>
              <p>
                To use certain features of the Service, you must register for an account. You agree to provide accurate and complete information and keep this information updated. You are solely responsible for maintaining the confidentiality of your password and for all activities that occur under your account.
              </p>
              <p>
                You must notify us immediately of any unauthorized use of your account or any other breach of security. We will not be liable for any loss or damage arising from your failure to comply with this requirement.
              </p>
            </div>

            <div id="ai-usage" className="scroll-mt-[140px]">
              <h2>4. Acceptable AI Usage</h2>
              <p>
                The AI Teacher feature is designed to assist with learning and comprehension. By using this feature, you agree:
              </p>
              <ul className="list-disc pl-5 mb-6 space-y-2">
                <li>Not to use the AI to generate answers for live exams or engage in academic dishonesty.</li>
                <li>Not to upload highly sensitive personal information, protected health information (PHI), or illegal content.</li>
                <li>That AI-generated outputs are for informational purposes and may sometimes contain errors or inaccuracies. You are responsible for verifying the accuracy of the information provided.</li>
              </ul>
            </div>

            <div id="payments" className="scroll-mt-[140px]">
              <h2>5. Subscriptions & Payments</h2>
              <p>
                Azviq offers both free and paid subscription plans (Azviq Pro). By upgrading to a paid plan, you agree to pay the fees associated with the subscription tier you select.
              </p>
              <ul className="list-disc pl-5 mb-6 space-y-2">
                <li><strong>Billing:</strong> Subscriptions are billed in advance on a recurring schedule (monthly or annually).</li>
                <li><strong>Cancellations:</strong> You may cancel your subscription at any time. Your access to the Pro features will continue until the end of your current billing cycle.</li>
                <li><strong>Refunds:</strong> All payments are non-refundable unless otherwise required by applicable law.</li>
              </ul>
            </div>

            <div id="intellectual-property" className="scroll-mt-[140px]">
              <h2>6. Intellectual Property</h2>
              <p>
                <strong>Your Content:</strong> You retain all ownership rights to the documents, notes, and data you upload to Azviq. By uploading, you grant us a temporary license to process your content solely to provide the AI features to you.
              </p>
              <p>
                <strong>Azviq's Property:</strong> All rights, title, and interest in the Services, including its software, UI design, branding, and logos, are the exclusive property of Azviq and its licensors.
              </p>
            </div>

            <div id="termination" className="scroll-mt-[140px]">
              <h2>7. Termination</h2>
              <p>
                We may terminate or suspend your account and bar access to the Services immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
              </p>
            </div>

            <div id="liability" className="scroll-mt-[140px]">
              <h2>8. Limitation of Liability</h2>
              <p>
                In no event shall Azviq, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; and (iii) any errors or omissions in the AI-generated output.
              </p>
            </div>

            <div id="changes" className="scroll-mt-[140px]">
              <h2>9. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our Services after any revisions become effective, you agree to be bound by the revised terms.
              </p>
            </div>

            <div id="contact" className="scroll-mt-[140px]">
              <h2>10. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <p className="font-medium text-[#1D1D1F]">
                Email: <a href="mailto:legal@azviq.in">legal@azviq.in</a><br/>
                Support Portal: <a href="/contact">azviq.in/contact</a>
              </p>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
