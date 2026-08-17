import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "FounderAlly — Your AI Business Analyst for every founder decision",
  description: "FounderAlly is your AI Business Analyst and co-pilot. From idea to scale, get clarity on what to build, why it matters, and how to make it succeed.",
  icons: {
    icon: "/favicon.ico",
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
      </body>
    </html>
  );
}
