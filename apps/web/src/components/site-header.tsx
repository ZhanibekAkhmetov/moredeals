"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

export function SiteHeader() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="border-b border-ink/15 bg-white">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-5">
          <Link href="/" className="text-base font-extrabold tracking-[-0.02em] text-forest">
            MoreDeals
          </Link>
          <span className="hidden border-l border-ink/15 pl-5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ink/45 sm:inline">
            Price comparison
          </span>
        </div>

        <nav className="flex items-center gap-1.5 text-xs" aria-label="Account navigation">
          {!isLoading && user?.role === "ADMIN" && (
            <>
              <Link
                href="/feed-builder"
                className="border border-ink/20 bg-white px-2.5 py-1.5 font-bold text-forest hover:bg-mist"
              >
                Feed builder
              </Link>
              <Link
                href="/merchant-feeds"
                className="border border-ink/20 bg-white px-2.5 py-1.5 font-bold text-forest hover:bg-mist"
              >
                Import feed
              </Link>
            </>
          )}
          {!isLoading && !user && (
            <>
              <Link href="/login" className="px-2.5 py-1.5 font-bold text-forest hover:bg-mist">
                Login
              </Link>
              <Link href="/register" className="bg-forest px-2.5 py-1.5 font-bold text-white">
                Register
              </Link>
            </>
          )}
          {!isLoading && user && (
            <>
              <span className="hidden px-2 text-ink/55 sm:inline">
                {user.name} · {user.role}
              </span>
              <button
                type="button"
                onClick={() => {
                  void logout().then(() => router.push("/"));
                }}
                className="border border-ink/20 px-2.5 py-1.5 font-bold text-forest hover:bg-mist"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
