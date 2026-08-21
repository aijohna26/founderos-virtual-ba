import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, getAdminConfig, verifyAdminSessionToken } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

// This route is deliberately exempt from Clerk's proxy.ts protection (it's in the public
// list) -- ADMIN_USER/ADMIN_PASS from .env.local is its own, separate gate, checked here via
// a signed session cookie rather than a Clerk session. See lib/admin/auth.ts.
export default async function AdminPage() {
  const configured = Boolean(getAdminConfig());
  const cookieStore = await cookies();
  const authed = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!configured) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <p className="text-sm font-semibold text-slate-400 max-w-sm text-center">
          Admin login isn&apos;t configured. Set <code className="text-slate-200">ADMIN_USER</code> and{" "}
          <code className="text-slate-200">ADMIN_PASS</code> in <code className="text-slate-200">.env.local</code>.
        </p>
      </div>
    );
  }

  if (!authed) {
    return <AdminLoginForm />;
  }

  return <AdminDashboard />;
}
