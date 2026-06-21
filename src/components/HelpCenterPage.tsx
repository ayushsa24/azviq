"use client";
import Navbar from "./landingpage/Navbar";
import Footer from "./landingpage/Footer";
import { useState } from "react";
import { Search, ChevronDown, Book, User, Settings, Shield, Zap, MessageCircle } from "lucide-react";

const CATEGORIES = [
  {
    title: "Getting Started",
    description: "Learn how to set up your Azviq workspace and import your first notes.",
    icon: <Book className="w-6 h-6 text-[#E84B1B]" />,
    link: "#getting-started"
  },
  {
    title: "Account & Billing",
    description: "Manage your subscription, update payment methods, and view invoices.",
    icon: <User className="w-6 h-6 text-[#3B82F6]" />,
    link: "#account"
  },
  {
    title: "Features & Usage",
    description: "Detailed guides on AI Chat, Pomodoro timers, and Task management.",
    icon: <Zap className="w-6 h-6 text-[#F59E0B]" />,
    link: "#features"
  },
  {
    title: "Privacy & Security",
    description: "Understand how we protect your data and manage parental controls.",
    icon: <Shield className="w-6 h-6 text-[#10B981]" />,
    link: "#security"
  }
];

const FAQS = [
  {
    question: "How do I reset my password?",
    answer: "You can reset your password by clicking on 'Forgot Password' on the login page. An email will be sent to your registered email address with a secure reset link."
  },
  {
    question: "Can I use Azviq offline?",
    answer: "Currently, Azviq requires an active internet connection to access the AI features and sync your notes across devices."
  },
  {
    question: "How does the AI Teacher work?",
    answer: "The AI Teacher uses advanced language models to provide contextual explanations based on your uploaded PDFs and notes. It acts as a personal tutor that understands your specific study materials."
  },
  {
    question: "What happens to my data if I cancel my subscription?",
    answer: "If you cancel your subscription, your account will be downgraded to the Free plan. You will still have access to your existing notes, but you will be subject to the Free plan's usage limits."
  },
  {
    question: "Is there a student discount available?",
    answer: "Yes! We offer a 50% discount for students with a valid .edu email address. Please contact our support team to verify your student status."
  }
];

export default function HelpCenterPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#1D1D1F] selection:bg-[#E84B1B]/20 selection:text-[#E84B1B] overflow-x-hidden">
      <Navbar isLoggedIn={isLoggedIn} />

      {/* Hero Search Section */}
      <section className="pt-[140px] md:pt-[180px] pb-16 md:pb-24 px-6 bg-[#F4F4F6]/50 border-b border-black/[0.05]">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-[36px] md:text-[52px] font-extrabold tracking-tight text-[#1D1D1F] mb-6">
            How can we help you?
          </h1>
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[#88888F]" />
            </div>
            <input
              type="text"
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-black/[0.08] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E84B1B]/50 focus:border-[#E84B1B] transition-all text-[15px] placeholder:text-[#88888F]"
              placeholder="Search for articles, guides, and FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <p className="text-[14px] text-[#6E6E73] mt-4 font-medium">
            Popular searches: <a href="#" className="text-[#E84B1B] hover:underline">importing pdfs</a>, <a href="#" className="text-[#E84B1B] hover:underline">billing issues</a>, <a href="#" className="text-[#E84B1B] hover:underline">reset password</a>
          </p>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {CATEGORIES.map((category, idx) => (
              <a
                key={idx}
                href={category.link}
                className="group flex flex-col p-8 rounded-3xl border border-black/[0.06] bg-white hover:border-[#E84B1B]/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F4F4F6] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
                <h3 className="text-[20px] font-bold text-[#1D1D1F] mb-2 group-hover:text-[#E84B1B] transition-colors">
                  {category.title}
                </h3>
                <p className="text-[14px] text-[#6E6E73] leading-relaxed font-medium">
                  {category.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-[#F4F4F6]/50 border-t border-black/[0.05]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[32px] md:text-[40px] font-bold text-[#1D1D1F] tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-[15px] text-[#6E6E73] font-medium">
              Can't find what you're looking for? Check out our most common questions.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className="border border-black/[0.06] rounded-2xl bg-white overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span className="text-[16px] font-bold text-[#1D1D1F]">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#88888F] transition-transform duration-300 ${openFaqIndex === index ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === index ? "max-h-[200px] pb-6 opacity-100" : "max-h-0 opacity-0"}`}
                >
                  <p className="text-[14px] text-[#6E6E73] leading-relaxed font-medium">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto bg-[#E84B1B]/10 rounded-full flex items-center justify-center mb-6">
            <MessageCircle className="w-8 h-8 text-[#E84B1B]" />
          </div>
          <h2 className="text-[28px] md:text-[36px] font-bold text-[#1D1D1F] mb-4">
            Still need help?
          </h2>
          <p className="text-[15px] text-[#6E6E73] font-medium mb-8">
            Our support team is always ready to help you with any issues or questions you might have. We typically reply within 24 hours.
          </p>
          <a
            href="mailto:support@azviq.in"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#1D1D1F] text-white font-bold text-[14px] hover:bg-[#333336] transition-colors shadow-lg"
          >
            Contact Support
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
