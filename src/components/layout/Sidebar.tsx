"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { signOut } from "next-auth/react";
import { Home, Library, CheckSquare, TrendingUp, MessageCircle, Settings, LogOut, Sparkles } from "lucide-react";

export default function Sidebar({
  open,
  isHovered = false,
  onMouseLeave
}: {
  open: boolean;
  isHovered?: boolean;
  onMouseLeave?: () => void;
}) {
  const { theme } = useTheme();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/library", label: "Library", icon: Library },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/progress", label: "Progress", icon: TrendingUp },
    { href: "/ai", label: "AI Chat", icon: MessageCircle },
    { href: "/preparation", label: "Preparation", icon: Sparkles },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      onMouseLeave={onMouseLeave}
      className={`fixed left-0 transition-all duration-300 ease-in-out hidden md:block
        ${theme === 'dark' ? 'bg-[#252525] border-[#545454]' : 'bg-[#CFCFCF] border-[#7D7D7D]'}
        ${open
          ? "top-16 h-[calc(100vh-4rem)] w-56 left-0 translate-x-0 border-r rounded-none z-[40]"
          : `z-[60] w-56 top-[69px] h-[calc(100vh-74px)] rounded-r-2xl border ${isHovered
            ? "left-0 translate-x-0 shadow-[4px_4px_24px_rgba(0,0,0,0.15)]"
            : "left-0 -translate-x-full"
          }`
        }`}
    >
      <nav className={`flex flex-col gap-1 p-3`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/") || (item.href === "/library" && pathname.startsWith("/library"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive
                  ? theme === 'dark'
                    ? 'bg-[#545454] text-white font-semibold'
                    : 'bg-[#7D7D7D] text-white font-semibold'
                  : theme === 'dark'
                    ? 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white'
                    : 'text-[#252525] hover:bg-[#7D7D7D] hover:text-white'
                }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        <div className="mt-auto pt-6 border-t border-[#7D7D7D]">
          <button
            onClick={handleLogout}
            className={`group flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200
              ${theme === 'dark'
                ? 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white'
                : 'text-[#545454] hover:bg-[#7D7D7D] hover:text-white'
              }`}
          >
            <LogOut className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="font-medium cursor-pointer">Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
