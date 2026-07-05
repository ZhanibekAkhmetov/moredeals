import Link from "next/link";
import { AdminFeedBuilderAccess } from "@/components/admin-feed-builder-access";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Feed Builder" };

export default function FeedBuilderPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-[1600px] px-4 pb-10 pt-5 sm:px-6">
        <Link href="/" className="text-xs font-bold text-forest/60 hover:text-forest">
          ← Back to comparisons
        </Link>
        <div className="mb-4 mt-3">
          <h1 className="text-xl font-extrabold text-forest">Feed Builder</h1>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-ink/50">
            Convert administrator-supplied product pages into editable merchant feed rows.
            Extraction checks Product JSON-LD, Open Graph/product metadata, then generic HTML.
            Review every row before export or import.
          </p>
        </div>
        <AdminFeedBuilderAccess />
      </main>
    </div>
  );
}
