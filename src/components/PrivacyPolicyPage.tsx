"use client";
import Navbar from "./landingpage/Navbar";
import Footer from "./landingpage/Footer";
import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "introduction", title: "1. Introduction" },
  { id: "information-we-collect", title: "2. Information We Collect" },
  { id: "how-we-use", title: "3. How We Use Your Information" },
  { id: "data-sharing", title: "4. Data Sharing & Third Parties" },
  { id: "student-data", title: "5. Student Data & Parental Controls" },
  { id: "cookies", title: "6. Cookies & Tracking" },
  { id: "data-security", title: "7. Data Security" },
  { id: "your-rights", title: "8. Your Privacy Rights" },
  { id: "changes", title: "9. Changes to This Policy" },
  { id: "contact", title: "10. Contact Us" },
];

export default function PrivacyPolicyPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [activeSection, setActiveSection] = useState("introduction");

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
            Privacy Policy
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

          {/* Main Content Policy Text */}
          <div className="w-full max-w-3xl prose prose-gray prose-headings:font-bold prose-h2:text-[24px] prose-h2:text-[#1D1D1F] prose-h2:mt-12 prose-h2:mb-6 prose-h2:tracking-tight prose-p:text-[15px] prose-p:text-[#545454] prose-p:leading-relaxed prose-p:mb-6 prose-li:text-[15px] prose-li:text-[#545454] prose-a:text-[#E84B1B] prose-a:no-underline hover:prose-a:underline">
            
            <div id="introduction" className="scroll-mt-[140px]">
              <h2>1. Introduction</h2>
              <p>
                Welcome to Azviq. We respect your privacy and are deeply committed to protecting your personal data. This Privacy Policy outlines how we collect, use, store, and share your information when you use the Azviq website, web application, and related services (collectively, the "Services").
              </p>
              <p>
                By accessing or using our Services, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy. If you do not agree with our policies and practices, please do not use Azviq.
              </p>
            </div>

            <div id="information-we-collect" className="scroll-mt-[140px]">
              <h2>2. Information We Collect</h2>
              <p>We collect information that identifies, relates to, or could reasonably be linked to you ("Personal Information"). This includes:</p>
              <ul className="list-disc pl-5 mb-6 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, password, date of birth, and profile picture.</li>
                <li><strong>Study Materials & Content:</strong> PDFs, notes, flashcards, tasks, and chat histories created within your workspace. We encrypt this data to ensure its security.</li>
                <li><strong>Usage Data:</strong> Information about your interactions with the app, such as pages visited, features used, and Pomodoro timer statistics.</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers.</li>
              </ul>
            </div>

            <div id="how-we-use" className="scroll-mt-[140px]">
              <h2>3. How We Use Your Information</h2>
              <p>We use the collected information for the following core purposes:</p>
              <ul className="list-disc pl-5 mb-6 space-y-2">
                <li>To provide, maintain, and optimize the Azviq platform and AI features.</li>
                <li>To power the "AI Teacher" by temporarily processing your uploaded PDFs and notes to generate quizzes and summaries.</li>
                <li>To communicate with you regarding updates, security alerts, and support messages.</li>
                <li>To personalize your study dashboard and provide accurate revision schedules and heatmap tracking.</li>
              </ul>
            </div>

            <div id="data-sharing" className="scroll-mt-[140px]">
              <h2>4. Data Sharing & Third Parties</h2>
              <p>
                Azviq does <strong>not</strong> sell your personal information or your study data to third-party advertisers. We only share information in the following limited circumstances:
              </p>
              <ul className="list-disc pl-5 mb-6 space-y-2">
                <li><strong>Service Providers:</strong> We use trusted third-party providers (like OpenAI, Google Gemini, and Supabase) strictly to provide infrastructure and AI functionality. They are contractually obligated to protect your data and only use it for providing the service.</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law, subpoena, or other legal process.</li>
              </ul>
            </div>

            <div id="student-data" className="scroll-mt-[140px]">
              <h2>5. Student Data & Parental Controls</h2>
              <p>
                Protecting student data is our highest priority. Azviq complies with standard educational privacy guidelines (such as COPPA in the US). 
              </p>
              <p>
                Through our <strong>Parental Mode</strong>, parents or guardians can link their accounts to a student account to monitor study time, app usage, and screen limits. Parents have the right to review the student's information, request its deletion, and refuse further collection of data.
              </p>
            </div>

            <div id="cookies" className="scroll-mt-[140px]">
              <h2>6. Cookies & Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our Services and hold certain information. Cookies help us remember your login session, save your preferences, and understand how people use the app so we can improve it. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </div>

            <div id="data-security" className="scroll-mt-[140px]">
              <h2>7. Data Security</h2>
              <p>
                We implement state-of-the-art security measures to maintain the safety of your personal information. Your sensitive data, including passwords and private notes, is encrypted at rest and in transit. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            <div id="your-rights" className="scroll-mt-[140px]">
              <h2>8. Your Privacy Rights</h2>
              <p>Depending on your location (e.g., GDPR in Europe, CCPA in California), you may have the following rights regarding your data:</p>
              <ul className="list-disc pl-5 mb-6 space-y-2">
                <li>The right to access and request a copy of your personal data.</li>
                <li>The right to request the deletion of your account and all associated data ("Right to be Forgotten").</li>
                <li>The right to correct inaccurate or incomplete information.</li>
                <li>The right to opt-out of promotional communications at any time.</li>
              </ul>
              <p>To exercise any of these rights, please contact us using the information below or utilize the "Data Export/Delete" options in your account settings.</p>
            </div>

            <div id="changes" className="scroll-mt-[140px]">
              <h2>9. Changes to This Policy</h2>
              <p>
                We may update our Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. We encourage you to review this policy periodically.
              </p>
            </div>

            <div id="contact" className="scroll-mt-[140px]">
              <h2>10. Contact Us</h2>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to our privacy team:
              </p>
              <p className="font-medium text-[#1D1D1F]">
                Email: <a href="mailto:privacy@azviq.in">privacy@azviq.in</a><br/>
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
