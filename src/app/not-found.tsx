import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF] dark:bg-[#1A1A1A] px-6 transition-colors duration-300">
      <div className="max-w-md w-full text-center flex flex-col items-center">
        {/* Abstract Premium SVG Illustration */}
        <div className="relative w-48 h-48 mb-8 animate-bounce-subtle text-[#C2A27A]">
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeDasharray="4 4" className="animate-[spin_40s_linear_infinite]" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-extrabold tracking-widest text-[#1D1D1F] dark:text-white">404</span>
          </div>
        </div>

        {/* Text Copy */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1D1D1F] dark:text-white tracking-tight leading-none mb-3">
          Lost in Study Space?
        </h1>
        <p className="text-[#6E6E73] dark:text-zinc-400 text-sm md:text-base leading-relaxed font-medium mb-8">
          The page you are looking for doesn't exist, has been moved, or is temporarily unavailable. Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <Link href="/" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-6 py-3 bg-[#C2A27A] hover:bg-[#b08f65] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98]">
              Go to Homepage
            </button>
          </Link>
          <Link href="/feedback" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.02] dark:hover:bg-zinc-700/50 text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-[0.98]">
              Contact Support
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
