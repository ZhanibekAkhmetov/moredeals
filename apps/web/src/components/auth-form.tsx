"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./auth-provider";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const auth = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "register") {
        await api.register(name, email, password);
        router.push("/login");
      } else {
        const user = await auth.login(email, password);
        router.push(user.role === "ADMIN" ? "/merchant-feeds" : "/");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-ink/15 bg-white p-5">
      {mode === "register" && (
        <label className="block text-xs font-bold text-ink/65">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
            className="mt-1.5 h-10 w-full border border-ink/20 bg-canvas px-3 text-sm outline-none focus:border-forest"
          />
        </label>
      )}
      <label className={`${mode === "register" ? "mt-4" : ""} block text-xs font-bold text-ink/65`}>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          className="mt-1.5 h-10 w-full border border-ink/20 bg-canvas px-3 text-sm outline-none focus:border-forest"
        />
      </label>
      <label className="mt-4 block text-xs font-bold text-ink/65">
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "register" ? 8 : undefined}
          required
          className="mt-1.5 h-10 w-full border border-ink/20 bg-canvas px-3 text-sm outline-none focus:border-forest"
        />
      </label>
      {mode === "register" && (
        <p className="mt-1.5 text-[0.68rem] text-ink/45">Minimum 8 characters.</p>
      )}
      {error && (
        <p className="mt-4 border border-coral/30 bg-coral/5 px-3 py-2 text-xs font-semibold text-coral">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 h-10 w-full bg-forest text-sm font-bold text-white disabled:opacity-50"
      >
        {isSubmitting
          ? "Please wait..."
          : mode === "login"
            ? "Login"
            : "Create account"}
      </button>
      <p className="mt-4 text-center text-xs text-ink/50">
        {mode === "login" ? "No account?" : "Already registered?"}{" "}
        <Link
          href={mode === "login" ? "/register" : "/login"}
          className="font-bold text-forest underline"
        >
          {mode === "login" ? "Register" : "Login"}
        </Link>
      </p>
    </form>
  );
}
