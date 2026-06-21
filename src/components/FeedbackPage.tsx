"use client";
import Navbar from "./landingpage/Navbar";
import Footer from "./landingpage/Footer";
import { useState } from "react";
import { MessageSquarePlus, Send, ThumbsUp, Bug, Lightbulb } from "lucide-react";

export default function FeedbackPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [formData, setFormData] = useState({
    type: "feature",
    rating: "",
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
      // We reuse the same contact API route, but you could create a dedicated /api/feedback route later
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Anonymous Feedback",
          email: "feedback@azviq.app", // Dummy email to pass validation if not provided
          message: `TYPE: ${formData.type}\nRATING: ${formData.rating || "None"}\n\n${formData.message}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      setIsSubmitted(true);
      setFormData({ type: "feature", rating: "", message: "" });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#1D1D1F] selection:bg-[#E84B1B]/20 selection:text-[#E84B1B] overflow-x-hidden">
      <Navbar isLoggedIn={isLoggedIn} />

      <section className="pt-[100px] md:pt-[120px] pb-16 md:pb-24 px-6 bg-[#F4F4F6]/50 border-b border-black/[0.05] min-h-[70vh] flex flex-col items-center">
        <div className="max-w-2xl mx-auto w-full">
          
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-white border border-black/[0.08] shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MessageSquarePlus className="w-8 h-8 text-[#E84B1B]" />
            </div>
            <h1 className="text-[36px] md:text-[48px] font-extrabold tracking-tight text-[#1D1D1F] mb-4 leading-tight">
              Share your feedback
            </h1>
            <p className="text-[15px] md:text-[16px] text-[#6E6E73] max-w-[480px] mx-auto leading-relaxed font-medium">
              We are constantly working to make Azviq better. Let us know what you love, what's broken, or what you'd like to see next.
            </p>
          </div>

          <div className="bg-white border border-black/[0.08] shadow-xl rounded-3xl p-8 md:p-10 relative overflow-hidden">
            {isSubmitted ? (
              <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <ThumbsUp className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-[#1D1D1F] mb-2">Thank you!</h3>
                <p className="text-[#6E6E73] font-medium text-sm max-w-[300px]">
                  Your feedback helps us build a better platform for everyone. We truly appreciate it.
                </p>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="mt-8 text-[13px] font-bold text-[#E84B1B] hover:text-orange-600 transition-colors px-6 py-2 rounded-full border border-[#E84B1B]/20"
                >
                  Submit more feedback
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                
                {/* Feedback Type */}
                <div>
                  <label className="block text-[13px] font-bold text-[#1D1D1F] mb-3">
                    What is this regarding?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { id: "feature", label: "Feature Idea", icon: <Lightbulb className="w-4 h-4" /> },
                      { id: "bug", label: "Bug Report", icon: <Bug className="w-4 h-4" /> },
                      { id: "general", label: "General", icon: <MessageSquarePlus className="w-4 h-4" /> },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[13px] font-bold transition-all ${
                          formData.type === type.id 
                            ? "bg-[#E84B1B]/10 border-[#E84B1B] text-[#E84B1B]" 
                            : "bg-white border-black/[0.08] text-[#6E6E73] hover:border-black/[0.15]"
                        }`}
                      >
                        {type.icon}
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-[13px] font-bold text-[#1D1D1F] mb-3">
                    How are you feeling about Azviq? (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    {[
                      { emoji: "😞", value: "terrible" },
                      { emoji: "😕", value: "bad" },
                      { emoji: "😐", value: "okay" },
                      { emoji: "🙂", value: "good" },
                      { emoji: "😍", value: "amazing" },
                    ].map((rating) => (
                      <button
                        key={rating.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: rating.value })}
                        className={`w-12 h-12 flex items-center justify-center text-2xl rounded-full transition-all ${
                          formData.rating === rating.value
                            ? "bg-[#E84B1B]/10 scale-110"
                            : "bg-[#F4F4F6] hover:bg-[#EAEAEF] grayscale hover:grayscale-0"
                        } ${formData.rating && formData.rating !== rating.value ? "opacity-40" : "opacity-100"}`}
                      >
                        {rating.emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-[13px] font-bold text-[#1D1D1F] mb-2">
                    Your feedback
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.1] bg-[#F4F4F6]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E84B1B]/50 focus:border-[#E84B1B] transition-all text-[14px] resize-none"
                    placeholder={
                      formData.type === "bug" ? "Please describe the issue, what you expected, and how to reproduce it..." :
                      formData.type === "feature" ? "What feature would make your study workflow better?" :
                      "Tell us what you're thinking..."
                    }
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
                  className="w-full py-3.5 rounded-xl bg-[#1D1D1F] text-white font-bold text-[14px] hover:bg-black active:scale-[0.98] transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Submit Feedback
                    </>
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
