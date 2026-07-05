import { ProductResults, type ProductResult } from "@/components/product-results";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";
import { calculateAverageProductRating } from "@/lib/ratings";

export default async function Home() {
  const products = await api.getProducts();
  const offerGroups = await Promise.all(
    products.map((product) => api.getProductOffers(product.id)),
  );
  const results: ProductResult[] = products.map((product, index) => ({
    ...product,
    averageRating: calculateAverageProductRating(offerGroups[index]),
    offerCount: offerGroups[index].length,
  }));

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold tracking-[-0.02em] text-forest">
              Smartphone price comparison
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-ink/55">
              Search imported smartphone listings and compare merchant offers.
            </p>
          </div>
        </div>
        <div className="mb-3">
          <h2 className="text-lg font-black text-forest">Imported smartphone comparison</h2>
          <p className="mt-0.5 text-xs text-ink/45">
            Listings imported from admin-submitted merchant URLs and feeds
          </p>
        </div>
        <ProductResults products={results} />
      </main>
      <footer className="mx-auto max-w-7xl border-t border-ink/15 px-4 py-4 text-xs text-ink/45 sm:px-6">
        MoreDeals portfolio prototype · Imported listings only
      </footer>
    </div>
  );
}
