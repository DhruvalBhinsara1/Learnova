// ─── Next.js core & React ────────────────────────────────────────────────────
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { headers } from "next/headers";

// ─── Third-party libraries ───────────────────────────────────────────────────
import { Toaster } from "react-hot-toast";

// ─── Global styles ───────────────────────────────────────────────────────────
import "./globals.css";

// ─── Layout & structural components ─────────────────────────────────────────
import ClientLayout from "@/components/ClientLayout";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";
import BackToTop from "@/components/ui/BackToTop";
import OfflineIndicator from "@/components/OfflineIndicator";
import ScrollProgress from "@/components/ui/ScrollProgress";
import NextTopLoader from "nextjs-toploader";
import RouteAnnouncer from "@/components/RouteAnnouncer";
import ErrorBoundary from "@/components/ErrorBoundary";

// ─── Context providers ───────────────────────────────────────────────────────
import AllProviders from "./providers/AllProviders";

// ─── SEO metadata & structured data ─────────────────────────────────────────
import { siteStructuredData } from "@/lib/seo/siteStructuredData";

// ─── Overlays ───────────────────────────────────────────────────────────────
import CommandPaletteWrapper from "@/components/CommandPaletteWrapper";
import ShortcutsModal from "@/components/ShortcutsModal";

// ─── Environment validation (server-side only) ───────────────────────────────
if (typeof window === "undefined") {
  const loadEnv = async () => {
    try {
      const { validateEnv } = await import("@/lib/env");
      validateEnv({
        throwOnError: false, // suppress build failures during local/CI evaluation
        warnOnce: true,
      });
    } catch (error) {
      console.warn(
        "Environment validation skipped (non-blocking):",
        error.message
      );
    }
  };
  loadEnv();
}

// ─── Font configuration ───────────────────────────────────────────────────────
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://learnova-web.vercel.app"),
  title: {
    default: "Learnova - Smart Student Engagement & Attendance Platform",
    template: "%s | Learnova",
  },
  description:
    "AI-powered student engagement platform with smart attendance tracking, classroom management, and analytics.",
  keywords: ["student engagement", "attendance platform", "Learnova"],
  authors: [{ name: "Learnova Team" }],
  creator: "Prem Shaw",
  publisher: "Learnova",
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout({ children }) {
  const nonce = headers().get("x-nonce") || undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteStructuredData),
          }}
        />
      </head>

      <body
        className={`font-sans ${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen transition-colors duration-300`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:p-4 focus:bg-blue-600 focus:text-white"
        >
          Skip to Main Content
        </a>

        <AllProviders>
          <ScrollProgress />
          <NextTopLoader color="#4f46e5" showSpinner={false} height={3} />

          <Suspense fallback={null}>
            <main id="main-content" className="outline-none" tabIndex="-1">
              <ErrorBoundary>
                <PageTransition>{children}</PageTransition>
              </ErrorBoundary>
            </main>

            <ScrollToTop />
            <Footer />
            <ClientLayout />
            <BackToTop />
            <RouteAnnouncer />
            <OfflineIndicator />

            <Toaster
              position="top-right"
              toastOptions={{ duration: 4000, style: { fontWeight: 600 } }}
            />

            <CommandPaletteWrapper />
            <ShortcutsModal />
          </Suspense>
        </AllProviders>
      </body>
    </html>
  );
}
