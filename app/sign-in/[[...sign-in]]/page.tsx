import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to FounderAlly</span>
        </Link>
      </div>

      <div className="mb-6 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 6V18L12 22L20 18V6L12 2Z" fill="currentColor" opacity="0.2"/>
              <path d="M6 8L12 5L18 8V16L12 19L6 16V8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12V19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M12 12L18 8.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Founder<span className="text-blue-500">Ally</span>
          </span>
        </Link>
      </div>

      <SignIn fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
