import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-xl font-extrabold text-forest">Login</h1>
        <p className="mb-4 mt-1 text-xs leading-5 text-ink/50">
          Sign in to access role-protected tools.
        </p>
        <AuthForm mode="login" />
      </main>
    </div>
  );
}
