"use client";
import Link from "next/link";

export default function PricingSection() {
  const plans = [
    {
      name: "Free",
      subtitle: "Starter",
      desc: "Essentials for starting your smart study journey.",
      price: "₹0",
      period: "Always free",
      features: [
        "40 AI chats / day",
        "30 AI Teacher messages / day",
        "30 Note Editor AI requests / day",
        "15 vision / image requests / day",
        "10 exercise generations / day",
        "Gemini 2.5 Flash (Fast)",
        "PDF upload up to 4 MB",
        "Standard response speed"
      ],
      buttonText: "Start for Free",
      popular: false,
      accent: "from-gray-500 to-slate-700"
    },
    {
      name: "Lite",
      subtitle: "Academic Essential",
      desc: "Unlock more AI power with high quality model responses.",
      price: "₹11",
      period: "/ month",
      features: [
        "200 AI chats / day",
        "100 AI Teacher messages / day",
        "100 Note Editor AI requests / day",
        "50 vision / image requests / day",
        "50 exercise generations / day",
        "GPT-4o Mini (High Quality)",
        "PDF upload up to 10 MB",
        "High priority response speed"
      ],
      buttonText: "Upgrade to Lite",
      popular: true,
      accent: "from-[#E84B1B] to-orange-500"
    },
    {
      name: "Premium",
      subtitle: "Pro Researcher",
      desc: "Experience the ultimate study companion with top models.",
      price: "₹399",
      period: "/ month",
      features: [
        "Unlimited AI chats",
        "Unlimited AI Teacher & Note AI",
        "Unlimited vision / image requests",
        "Unlimited exercise generations",
        "GPT-4o + Claude 3.5 Sonnet (The Best)",
        "PDF upload up to 50 MB",
        "Turbo response speed"
      ],
      buttonText: "Upgrade to Premium",
      popular: false,
      accent: "from-indigo-500 to-purple-600"
    }
  ];

  return (
    <section id="pricing" className="py-28 px-6 bg-white border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <p className="text-xs text-[#E84B1B] uppercase tracking-[0.15em] mb-4 font-bold">
            Pricing Plans
          </p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1D1D1F] tracking-tight leading-tight max-w-[600px]">
            Simple, transparent pricing.
          </h2>
          <p className="text-[#6E6E73] text-base md:text-lg mt-3 max-w-[520px] leading-relaxed font-medium">
            Choose the perfect plan for your academic goals. Secure checkout powered by Razorpay.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="flex overflow-x-auto overflow-y-hidden md:grid md:grid-cols-3 gap-6 md:gap-8 items-stretch pt-8 pb-8 px-4 md:px-0 -mx-4 md:mx-0 snap-x snap-mandatory scrollbar-hide">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative flex flex-col justify-between rounded-3xl p-8 transition-all duration-300 flex-shrink-0 w-[290px] md:w-auto snap-center ${plan.popular ? "bg-white border-2 border-[#E84B1B] shadow-2xl scale-102 z-10" : "bg-[#F4F4F6]/50 border border-black/[0.06] hover:bg-white hover:border-black/15 hover:shadow-lg"}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#E84B1B] text-white text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md">
                  Most Popular
                </span>
              )}

              <div>
                {/* Plan Header */}
                <h3 className="text-xl font-bold text-[#1D1D1F] mb-1">{plan.name}</h3>
                <p className="text-[11px] text-[#88888F] font-bold uppercase tracking-wider mb-2">{plan.subtitle}</p>
                <p className="text-xs text-[#6E6E73] font-medium leading-relaxed mb-6">{plan.desc}</p>
                
                {/* Price Display */}
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl md:text-5xl font-black text-[#1D1D1F] tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[#88888F] font-bold">
                    {plan.period}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-black/[0.06] w-full mb-8" />

                {/* Features List */}
                <ul className="flex flex-col gap-4 mb-8">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-xs text-[#1D1D1F] font-medium">
                      <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? "text-[#E84B1B]" : "text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="leading-normal text-[#545454]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <Link href="/signup" className="block w-full">
                <button
                  className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-[0.98] ${plan.popular ? "bg-[#E84B1B] text-white hover:bg-orange-600 shadow-md" : "bg-white text-[#1D1D1F] border border-black/[0.08] hover:border-black/15 hover:bg-black/[0.02]"}`}
                >
                  {plan.buttonText}
                </button>
              </Link>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
