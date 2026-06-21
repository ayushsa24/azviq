"use client";
import Navbar from "./landingpage/Navbar";
import Footer from "./landingpage/Footer";
import { useState } from "react";
import { MessageSquare, Mail, Send } from "lucide-react";

export default function ContactPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setIsSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#1D1D1F] selection:bg-[#E84B1B]/20 selection:text-[#E84B1B] overflow-x-hidden">
      <Navbar isLoggedIn={isLoggedIn} />

      <section className="pt-[140px] md:pt-[180px] pb-16 md:pb-24 px-6 bg-[#F4F4F6]/50 border-b border-black/[0.05] min-h-[70vh] flex flex-col justify-center">
        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">

          {/* Left Column: Text */}
          <div>
            <div className="w-14 h-14 bg-white border border-black/[0.08] shadow-sm rounded-2xl flex items-center justify-center mb-6">
              <MessageSquare className="w-7 h-7 text-[#E84B1B]" />
            </div>
            <h1 className="text-[36px] md:text-[48px] font-extrabold tracking-tight text-[#1D1D1F] mb-4 leading-tight">
              Get in touch
            </h1>
            <p className="text-[15px] md:text-[16px] text-[#6E6E73] mb-8 leading-relaxed font-medium">
              Have a question, feedback, or need help with Azviq? We'd love to hear from you. Fill out the form and our team will get back to you within 24 hours.
            </p>

            <div className="flex items-center gap-4 p-4 bg-white border border-black/[0.06] rounded-2xl">
              <div className="w-10 h-10 bg-[#F4F4F6] rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#1D1D1F]" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#88888F] uppercase tracking-wider mb-0.5">Email us</p>
                <a href="mailto:support@azviq.in" className="text-[15px] font-bold text-[#1D1D1F] hover:text-[#E84B1B] transition-colors">
                  support@azviq.in
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="bg-white border border-black/[0.08] shadow-xl rounded-3xl p-8 md:p-10 relative overflow-hidden">
            {isSubmitted ? (
              <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <Send className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-[#1D1D1F] mb-2">Message Sent!</h3>
                <p className="text-[#6E6E73] font-medium text-sm">
                  Thanks for reaching out. We'll get back to you shortly.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-8 text-[13px] font-bold text-[#E84B1B] hover:text-orange-600 transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label htmlFor="name" className="block text-[13px] font-bold text-[#1D1D1F] mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.1] bg-[#F4F4F6]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E84B1B]/50 focus:border-[#E84B1B] transition-all text-[14px]"
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-[13px] font-bold text-[#1D1D1F] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.1] bg-[#F4F4F6]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E84B1B]/50 focus:border-[#E84B1B] transition-all text-[14px]"
                    placeholder="jane@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-[13px] font-bold text-[#1D1D1F] mb-2">
                    How can we help?
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.1] bg-[#F4F4F6]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E84B1B]/50 focus:border-[#E84B1B] transition-all text-[14px] resize-none"
                    placeholder="Tell us about your issue, feedback, or inquiry..."
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 mt-2 rounded-xl bg-[#E84B1B] text-white font-bold text-[14px] hover:bg-orange-600 active:scale-[0.98] transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
