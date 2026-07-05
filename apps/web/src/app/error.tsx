"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="max-w-lg border border-ink/20 bg-white p-6 text-center">
        <p className="eyebrow">Connection problem</p>
        <h1 className="mt-3 text-xl font-extrabold text-forest">
          We could not load the deals.
        </h1>
        <p className="mt-4 leading-7 text-ink/55">
          Check that the MoreDeals API is running on port 4000, then try again.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-7 rounded-xl bg-forest px-5 py-3 font-bold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
