"use client";
import { motion } from "framer-motion";

const BLOG_POSTS = [
  {
    title: "Mastering Active Recall: The Science of High-Yield Study Streaks",
    desc: "Discover how spaced retrieval practice alters brain connections to transition memories from short-term to long-term storage.",
    category: "Study Science",
    date: "June 20, 2026",
    readTime: "5 min read",
    gradient: "from-indigo-500 to-purple-600",
    badgeColor: "text-indigo-600 bg-indigo-50"
  },
  {
    title: "Pomodoro vs. Deep Work: Which Rules Your Study Sessions?",
    desc: "A comparative breakdown of structured interval studying versus long-form flow states. Learn how to combine both for maximum exam preparation output.",
    category: "Productivity",
    date: "June 18, 2026",
    readTime: "4 min read",
    gradient: "from-rose-500 to-orange-500",
    badgeColor: "text-rose-600 bg-rose-50"
  },
  {
    title: "Leveraging AI for Syllabus Mapping: Textbooks to Target Quizzes",
    desc: "An actionable guide on using generative language models to unpack heavy syllabus topics and build custom quizzes that target your weak areas.",
    category: "AI & Education",
    date: "June 15, 2026",
    readTime: "6 min read",
    gradient: "from-emerald-500 to-teal-600",
    badgeColor: "text-emerald-600 bg-emerald-50"
  }
];

export default function BlogSection({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <section id="blog" className="py-28 px-6 bg-[#F4F4F6]/50 border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div>
            <p className="text-[11px] text-[#E84B1B] uppercase tracking-[0.15em] mb-4 font-bold">
              Latest Insights
            </p>
            <h2 className="text-[36px] md:text-[44px] font-bold text-[#1D1D1F] tracking-tight leading-tight">
              Learning Guides & Updates
            </h2>
            <p className="text-[#6E6E73] text-base md:text-lg mt-3 max-w-[540px] leading-relaxed font-medium">
              Tips, tutorials, and research deep dives on cognitive psychology, active recall, and studying smarter.
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-6 md:mt-0">
            <a
              href="#"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1D1D1F] hover:text-[#E84B1B] transition-colors duration-200"
            >
              Read all posts
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-black/[0.08] hover:border-black/15 bg-white text-xs font-semibold rounded-full text-[#6E6E73] hover:text-[#1D1D1F] active:scale-[0.98] transition-all"
              >
                Hide Blog
              </button>
            )}
          </div>
        </div>

        {/* Blog Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post, idx) => (
            <motion.article
              key={idx}
              className="group flex flex-col bg-white border border-black/[0.06] rounded-3xl overflow-hidden hover:border-black/15 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              
              {/* Dynamic Gradient Thumbnail */}
              <div className="relative h-[200px] w-full overflow-hidden bg-gray-100 flex items-center justify-center">
                <div className={`absolute inset-0 bg-gradient-to-tr ${post.gradient} opacity-90 group-hover:scale-105 transition-transform duration-500`} />
                {/* Visual abstract overlay patterns */}
                <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                <div className="absolute w-[120%] h-[120%] -top-10 -left-10 border border-white/10 rounded-full group-hover:scale-95 transition-transform duration-500 pointer-events-none" />
                <div className="absolute w-[80%] h-[80%] top-6 left-6 border border-white/5 rounded-full group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
                
                {/* Decorative floating badge */}
                <span className={`absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${post.badgeColor} shadow-sm z-10`}>
                  {post.category}
                </span>
              </div>

              {/* Text Content */}
              <div className="p-6 flex flex-col justify-between flex-grow">
                <div>
                  {/* Date & Read time */}
                  <div className="flex items-center gap-3 text-[11px] text-[#88888F] font-bold uppercase tracking-wider mb-3">
                    <span>{post.date}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span>{post.readTime}</span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-lg font-bold text-[#1D1D1F] leading-snug group-hover:text-[#E84B1B] transition-colors duration-200 mb-3">
                    {post.title}
                  </h3>
                  
                  {/* Desc */}
                  <p className="text-[13px] text-[#6E6E73] leading-relaxed font-medium">
                    {post.desc}
                  </p>
                </div>

                {/* Read More Link */}
                <div className="mt-6 pt-4 border-t border-black/[0.04] flex items-center gap-2 text-xs font-bold text-[#1D1D1F] group-hover:text-[#E84B1B] transition-colors duration-150">
                  <span>Read Article</span>
                  <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
                </div>

              </div>

            </motion.article>
          ))}
        </div>

      </div>
    </section>
  );
}
