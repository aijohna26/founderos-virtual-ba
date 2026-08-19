import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserProfile } from "@clerk/nextjs";

// Already gated: proxy.ts protects every route except the ones it explicitly lists as
// public, and "/account" isn't one of them, so signed-out visitors are redirected to
// sign-in before this ever renders.
//
// <UserProfile /> is Clerk's own account UI. Because Billing is enabled on this instance,
// it automatically includes a Plans/Billing section with upgrade, downgrade, cancellation,
// payment methods and invoices for solo_founder/venture_pro -- no custom billing UI needed.
export default function AccountPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex justify-center">
          <UserProfile
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border border-slate-200 rounded-2xl",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
