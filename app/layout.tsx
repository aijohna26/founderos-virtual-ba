import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://getfounderally.com"),
  title: "FounderAlly — Your AI Business Analyst for Every Founder Decision",
  description:
    "FounderAlly is your elite AI Business Analyst and autonomous venture co-pilot. Real 2-way voice conversations with your AI advisor, autonomous Kanban board management, customer discovery, and hypothesis testing.",
  keywords: ["AI Business Analyst", "Founder Co-Pilot", "Kanban Board AI", "Customer Discovery", "Startup Validation"],
  openGraph: {
    title: "FounderAlly — Your AI Business Analyst",
    description: "Transform your startup ideas into validated execution with AI.",
    url: "https://getfounderally.com",
    siteName: "FounderAlly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FounderAlly — AI Business Analyst for Founders",
    description: "Real 2-way voice conversations with your AI advisor on business strategy and board execution.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
        <ClerkProvider>
          {children}
        </ClerkProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
