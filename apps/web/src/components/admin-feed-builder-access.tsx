"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-provider";
import { FeedBuilder } from "./feed-builder";

export function AdminFeedBuilderAccess() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return <p className="border border-ink/15 bg-white p-4 text-sm text-ink/55">Checking access...</p>;
  }
  if (user.role !== "ADMIN") {
    return (
      <div className="border border-coral/30 bg-white p-5">
        <h2 className="text-base font-extrabold text-forest">Access denied</h2>
        <p className="mt-2 text-sm text-ink/55">Feed extraction requires an ADMIN account.</p>
        <Link href="/" className="mt-4 inline-block text-xs font-bold text-forest underline">
          Return to comparisons
        </Link>
      </div>
    );
  }
  return <FeedBuilder />;
}
