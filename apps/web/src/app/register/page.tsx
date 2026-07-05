import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-xl font-extrabold text-forest">Register</h1>
        <p className="mb-4 mt-1 text-xs leading-5 text-ink/50">
          New registrations receive the standard USER role.
        </p>
        <AuthForm mode="register" />
      </main>
    </div>
  );
}
