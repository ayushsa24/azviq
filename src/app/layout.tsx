import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lexend } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ZoomProvider } from "@/contexts/ZoomContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthProvider } from "@/contexts/AuthProvider";
import { UserProvider } from "@/contexts/UserContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AppShell from "@/components/layout/AppShell";
import { AppDialogProvider } from "@/components/ui/AppDialog";
import { ToastProvider } from "@/contexts/ToastContext";
import { PostHogProvider } from "@/analytics/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Azviq",
  description: "AI-powered study companion",
  icons: {
    icon: [
      { url: "/icon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/icon-light.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Browser Theme Color - Matches App Header */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F5F3EF" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1A1A1A" />
        
        {/* Safari / iOS Specific */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' || (!theme && supportDark);
                  var color = isDark ? '#1A1A1A' : '#F5F3EF';
                  
                  // Apply theme class
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  
                  // Force background colors for Safari & Brave
                  document.documentElement.style.backgroundColor = color;
                  if (document.body) document.body.style.backgroundColor = color;
                  
                  // Universal Theme Color Meta Update
                  var updateMetas = function(c) {
                    var metas = document.querySelectorAll('meta[name="theme-color"]');
                    for (var i = 0; i < metas.length; i++) {
                      metas[i].setAttribute('content', c);
                    }
                  };
                  updateMetas(color);

                  // Specialized Method for Brave Browser
                  // Brave often requires an explicit check and a slight delay or re-application
                  if (navigator.brave && navigator.brave.isBrave) {
                    navigator.brave.isBrave().then(function(isBrave) {
                      if (isBrave) {
                        // Re-apply for Brave after a micro-tick to ensure override
                        setTimeout(function() { updateMetas(color); }, 50);
                      }
                    });
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lexend.variable} antialiased`}
      >
        <AuthProvider>
          <PostHogProvider>
          <UserProvider>
            <LanguageProvider>
              <ZoomProvider>
                <ThemeProvider>
                  <NotificationProvider>
                    <SettingsProvider>
                      <ToastProvider>
                        <AppDialogProvider>
                          {children}
                        </AppDialogProvider>
                      </ToastProvider>
                    </SettingsProvider>
                  </NotificationProvider>
                </ThemeProvider>
              </ZoomProvider>
            </LanguageProvider>
          </UserProvider>
          </PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
