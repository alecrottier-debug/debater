import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Cinzel, Cormorant_Garamond } from "next/font/google";
import Link from "next/link";
import { Brain, Plus, HelpCircle, History as HistoryIcon } from "lucide-react";
import { Suspense } from "react";
import PostHogProvider from "@/components/PostHogProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Debater",
  description: "AI-powered debate simulator",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${cinzel.variable} ${cormorant.variable} antialiased min-h-screen bg-[#f8f9fb]`}
      >
      <Suspense fallback={null}>
        <PostHogProvider />
      </Suspense>
        {/* Fixed background illustration */}
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.18] contrast-125 grayscale"
          style={{ backgroundImage: "url('/avatars/background.png')" }}
        />
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Brain aria-hidden className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="hidden text-xl font-bold tracking-tight text-gray-900 sm:inline">
                Debater
              </span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-3">
              <Link
                href="/personas/create"
                aria-label="Create Persona"
                className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2 text-xs font-medium text-gray-500 transition-all hover:border-blue-400 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:h-auto sm:px-3 sm:py-1.5"
              >
                <Plus aria-hidden className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Create Persona</span>
              </Link>
              <Link
                href="/faq"
                aria-label="FAQ"
                className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:h-auto sm:px-3 sm:py-1.5"
              >
                <HelpCircle aria-hidden className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">FAQ</span>
              </Link>
              <Link
                href="/history"
                aria-label="History"
                className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:h-auto sm:px-3 sm:py-1.5"
              >
                <HistoryIcon aria-hidden className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">History</span>
              </Link>
            </nav>
          </div>
          <div className="border-t border-gray-100 bg-amber-50/80 px-4 py-1.5 text-center text-[11px] leading-tight text-amber-700 sm:text-xs">
            AI-generated simulation. Not real statements. Not endorsed by or affiliated with any person depicted.
          </div>
        </header>
        <main className="relative z-10 mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
