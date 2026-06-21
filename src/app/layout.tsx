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
import CookieConsent from "@/components/CookieConsent";

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
  metadataBase: new URL("https://azviq.in"),
  title: {
    default: "Azviq — AI-Powered Study Companion",
    template: "%s — Azviq",
  },
  description: "Upload PDFs, chat with AI Teacher, generate custom revision exercises, and organize your study notes seamlessly.",
  icons: {
    icon: [
      { url: "/icon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/icon-light.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://azviq.in",
    title: "Azviq — AI-Powered Study Companion",
    description: "Upload PDFs, chat with AI Teacher, generate custom revision exercises, and organize your study notes seamlessly.",
    siteName: "Azviq",
    images: [
      {
        url: "/azviq_logo.png",
        width: 1200,
        height: 630,
        alt: "Azviq — AI-Powered Study Companion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Azviq — AI-Powered Study Companion",
    description: "Upload PDFs, chat with AI Teacher, generate custom revision exercises, and organize your study notes seamlessly.",
    images: ["/azviq_logo.png"],
    creator: "@azviq",
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
        <meta name="apple-mobile-web-app-title" content="Azviq" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-light.png" />
        <link rel="apple-touch-startup-image" href="/icon-light.png" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-startup-image" href="/icon-dark.png" media="(prefers-color-scheme: dark)" />
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
        {/* Google Structured Data / JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Azviq",
              "operatingSystem": "All",
              "applicationCategory": "EducationalApplication",
              "description": "An AI-powered study companion designed for students to manage libraries, chat with custom AI tutors, and generate personalized revision tools.",
              "offers": {
                "@type": "AggregateOffer",
                "priceCurrency": "INR",
                "lowPrice": "0",
                "highPrice": "399",
                "offers": [
                  {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "INR",
                    "name": "Free Starter Plan"
                  },
                  {
                    "@type": "Offer",
                    "price": "149",
                    "priceCurrency": "INR",
                    "name": "Lite Plan"
                  },
                  {
                    "@type": "Offer",
                    "price": "399",
                    "priceCurrency": "INR",
                    "name": "Premium Plan"
                  }
                ]
              }
            })
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
                          <CookieConsent />
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
