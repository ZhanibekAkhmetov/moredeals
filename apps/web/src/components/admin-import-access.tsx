"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MerchantFeedImporter } from "./merchant-feed-importer";
import { useAuth } from "./auth-provider";

export function AdminImportAccess() {
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
        <p className="mt-2 text-sm leading-6 text-ink/55">
          Merchant feed imports require an ADMIN account. Your account role is USER.
        </p>
        <Link href="/" className="mt-4 inline-block text-xs font-bold text-forest underline">
          Return to comparisons
        </Link>
      </div>
    );
  }

  return <MerchantFeedImporter />;
}
