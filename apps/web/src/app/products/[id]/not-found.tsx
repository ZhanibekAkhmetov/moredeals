import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-28 text-center">
        <p className="eyebrow">404 · Product unavailable</p>
        <h1 className="mt-3 text-2xl font-extrabold text-forest">
          This deal trail went cold.
        </h1>
        <p className="mt-5 text-lg text-ink/55">
          The product may have moved or is no longer in the demo catalog.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-forest px-5 py-3 font-bold text-white"
        >
          Browse all products
        </Link>
      </main>
    </div>
  );
}
