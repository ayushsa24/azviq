"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqSection() {
  const faqs: FaqItem[] = [
    {
      question: "How does the AI Teacher understand my specific syllabus?",
      answer: "You can upload your lecture slides, notes, or textbook PDFs directly into your library. The AI uses these documents as active context to explain concepts, generate custom revision exercises, and answer questions exactly tailored to your study material."
    },
    {
      question: "Can I use Azviq to analyze images and hand-drawn diagrams?",
      answer: "Yes! Our AI Chat supports full image analysis. You can upload biology diagrams, chemical structures, circuit schematics, or photos of your handwritten notes, and the AI will recognize, translate, and explain the content clearly."
    },
    {
      question: "Are my uploaded study materials kept private?",
      answer: "Absolutely. Security is our priority. Your documents, notes, and chat history are fully encrypted and private to your account. We never sell your data or use your uploads to train public AI models."
    },
    {
      question: "What AI models does the Premium plan use?",
      answer: "The Premium plan grants unlimited access to industry-leading models, including GPT-4o and Claude 3.5 Sonnet. These models provide the highest quality reasoning for advanced research, mathematics, and complex academic topics."
    },
    {
      question: "How does the Parental Control feature work?",
      answer: "Parents can link their dashboard to view high-level analytics, such as time spent studying, completed exercises, and weekly progress reports. To preserve your independent study space, parents cannot read your actual notes or private chat logs."
    },
    {
      question: "Can I cancel my subscription at any time?",
      answer: "Yes. You can manage or cancel your subscription at any time directly from your Account Settings with one click. You will retain full access to your plan until the end of your current billing period."
    }
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="py-24 px-6 bg-white border-t border-black/[0.05]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <p className="text-xs text-[#E84B1B] uppercase tracking-[0.15em] mb-4 font-bold">
            Frequently Asked Questions
          </p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1D1D1F] tracking-tight leading-tight max-w-[600px]">
            Got questions? We've got answers.
          </h2>
          <p className="text-[#6E6E73] text-base md:text-lg mt-3 max-w-[520px] leading-relaxed font-medium">
            Everything you need to know about the ultimate AI study companion.
          </p>
        </div>

        {/* FAQ Accordions */}
        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`bg-[#F4F4F6]/40 border border-black/[0.05] rounded-2xl transition-all duration-300 ${
                  isOpen ? "bg-white shadow-md border-black/10" : "hover:bg-white hover:border-black/10"
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left p-6 font-semibold text-[#1D1D1F] text-base md:text-lg focus:outline-none"
                >
                  <span className="leading-snug">{faq.question}</span>
                  <span
                    className={`ml-4 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-black/[0.04] transition-all duration-300 ${
                      isOpen ? "rotate-45 bg-[#E84B1B]/10 text-[#E84B1B]" : "text-[#1D1D1F] hover:bg-black/[0.08]"
                    }`}
                  >
                    {/* Plus icon rotates 45 deg to become an 'x' */}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-6 pb-6 text-sm md:text-base text-[#6E6E73] leading-relaxed font-medium">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
