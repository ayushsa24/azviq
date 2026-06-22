import Link from "next/link";
import Image from "next/image";

const FOOTER_LINKS = {
  Product: ["Dashboard", "Library", "AI Chat", "Tasks", "Preparation"],
  Company: ["About", "Blog", "Careers"],
  Support: ["Contact", "Feedback"], // "Help Center" hidden for now
  Legal: ["Privacy", "Terms"],
};

export default function Footer() {
  return (
    <footer className="bg-[#EAEAEF] border-t border-black/[0.05] px-6 pt-14 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 pb-10 border-b border-black/[0.05]">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-white/40 backdrop-blur-md border border-black/[0.08] rounded-md flex items-center justify-center p-0 shadow-sm">
                <img src="/azviq_logo.png" alt="Azviq Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-[#1D1D1F]">Azviq</span>
            </div>
            <p className="text-[13px] text-[#6E6E73] font-medium">AI-powered study companion</p>
          </div>
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-[13px] font-bold text-[#1D1D1F] mb-3">{section}</p>
              <ul className="space-y-2">
                {links.map(l => {
                  let href = "#";
                  if (section === "Product") {
                    if (l === "Dashboard") href = "/#dashboard";
                    else if (l === "Library") href = "/#library";
                    else if (l === "AI Chat") href = "/#ai-chat";
                    else if (l === "Tasks") href = "/#tasks";
                    else if (l === "Preparation") href = "/#preparation";
                  } else if (section === "Company" && l === "About") {
                    href = "/about";
                  } else if (section === "Support" && l === "Help Center") {
                    // Help center disabled for now
                    // href = "/help";
                  } else if (section === "Support" && l === "Contact") {
                    href = "/contact";
                  } else if (section === "Support" && l === "Feedback") {
                    href = "/feedback";
                  } else if (section === "Legal" && l === "Privacy") {
                    href = "/privacy";
                  } else if (section === "Legal" && l === "Terms") {
                    href = "/terms";
                  }

                  const isComingSoon = l === "Blog" || l === "Careers";

                  return (
                    <li key={l} className="group relative w-max">
                      {isComingSoon ? (
                        <span className="text-[13px] text-[#6E6E73]/50 cursor-not-allowed">
                          {l}
                        </span>
                      ) : (
                        <Link href={href} className="text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
                          {l}
                        </Link>
                      )}
                      
                      {isComingSoon && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#1D1D1F] text-white text-[10px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                          Coming Soon
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1D1D1F]"></div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6">
          <p className="text-[13px] text-[#6E6E73] font-medium">© 2026 Azviq. All rights reserved.</p>
          {/* Social icons removed for now 
          <div className="flex gap-4">
            {["𝕏", "⌂", "📸"].map(i => <a key={i} href="#" className="text-[#6E6E73] hover:text-[#1D1D1F] transition-colors text-base">{i}</a>)}
          </div>
          */}
        </div>
      </div>
    </footer>
  );
}
