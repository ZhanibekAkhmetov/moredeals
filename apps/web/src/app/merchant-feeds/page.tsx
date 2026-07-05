import Link from "next/link";
import { AdminImportAccess } from "@/components/admin-import-access";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Import merchant feed",
};

const requiredColumns = [
  "shopName",
  "shopDomain",
  "productTitle",
  "brand",
  "model",
  "variantName",
  "ean",
  "gtin",
  "mpn",
  "condition",
  "price",
  "shippingCost",
  "currency",
  "deliveryMinDays",
  "deliveryMaxDays",
  "stockStatus",
  "paymentMethods",
  "returnDays",
  "returnShipping",
  "warrantyMonths",
  "productRating",
  "productReviewCount",
  "storeRating",
  "storeReviewCount",
  "productUrl",
  "imageUrl",
];

export default function MerchantFeedsPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6">
        <Link href="/" className="text-xs font-bold text-forest/60 hover:text-forest">
          ← Back to comparisons
        </Link>
        <div className="mb-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-[-0.02em] text-forest">
              Import merchant feed
            </h1>
            <span className="rounded border border-coral/20 bg-coral/5 px-2 py-1 text-[0.62rem] font-bold uppercase text-coral">
              Manual import
            </span>
          </div>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink/50">
            Ingest direct or manually curated shop listings without scraping.
            Every accepted row updates an offer and records a price snapshot.
          </p>
        </div>
        <section className="mb-5 border border-ink/15 bg-white">
          <div className="border-b border-ink/15 bg-mist/60 px-4 py-2.5">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.07em] text-forest">
              Import process
            </h2>
          </div>
          <ol className="grid border-b border-ink/15 text-xs md:grid-cols-5">
            {[
              ["1", "Download template"],
              ["2", "Fill rows with shop listing data"],
              ["3", "Upload the CSV file"],
              ["4", "Create or update catalog records and price snapshots"],
              ["5", "Review imported offers on product comparison pages"],
            ].map(([number, label]) => (
              <li key={number} className="border-b border-ink/10 p-3 last:border-0 md:border-b-0 md:border-r md:last:border-r-0">
                <span className="mr-2 inline-grid size-5 place-items-center bg-forest text-[0.65rem] font-bold text-white">
                  {number}
                </span>
                <span className="font-semibold text-ink/70">{label}</span>
              </li>
            ))}
          </ol>
          <div className="px-4 py-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.07em] text-ink/45">
              CSV columns
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {requiredColumns.map((column) => (
                <code key={column} className="border border-ink/15 bg-canvas px-1.5 py-1 text-[0.64rem] text-ink/65">
                  {column}
                </code>
              ))}
            </div>
            <p className="mt-2 text-[0.68rem] text-ink/45">
              Required values include shopName, shopDomain, productTitle, brand,
              model, variantName, price, currency, and productUrl. EAN, GTIN, and
              MPN are optional but improve matching. Separate payment methods with a pipe, for example
              Card|PayPal|Klarna.
            </p>
          </div>
        </section>
        <AdminImportAccess />
      </main>
    </div>
  );
}
