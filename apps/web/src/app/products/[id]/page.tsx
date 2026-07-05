import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferComparison } from "@/components/offer-comparison";
import { SiteHeader } from "@/components/site-header";
import { api, ApiError } from "@/lib/api";
import { calculateAverageProductRating } from "@/lib/ratings";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const product = await api.getProduct(id);
    return { title: `Compare ${product.name}` };
  } catch {
    return { title: "Product comparison" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const productRequest = api.getProduct(id);
  const offersRequest = api.getProductOffers(id);

  let product;
  let offers;

  try {
    [product, offers] = await Promise.all([productRequest, offersRequest]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const averageRating = calculateAverageProductRating(offers);
  const hasImportedOffers = offers.some(
    (offer) => offer.source === "IMPORTED_FEED",
  );

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6">
        <Link
          href="/"
          className="text-xs font-bold text-forest/60 transition hover:text-forest"
        >
          ← All products
        </Link>

        <section className="mt-4 border border-ink/15 bg-white p-4">
          <div className="flex items-start gap-4">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="size-20 shrink-0 border border-ink/20 bg-white object-contain" />
            ) : (
              <div className="grid size-14 shrink-0 place-items-center border border-ink/20 bg-mist text-xs font-black text-forest">
                {product.brand.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-coral">{product.brand}</span>
                <span className="rounded bg-mist px-2 py-0.5 capitalize text-ink/55">
                  {product.category}
                </span>
                {hasImportedOffers && (
                  <span className="rounded bg-lime/35 px-2 py-0.5 font-bold text-forest">
                    Includes imported feeds
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <h1 className="text-xl font-extrabold tracking-[-0.02em] text-forest sm:text-2xl">
                  {product.name}
                </h1>
                <div className="shrink-0 text-sm font-bold text-forest">
                  <span className="text-coral">★</span>{" "}
                  {averageRating === null ? "No product rating" : `${averageRating.toFixed(1)} average`}
                </div>
              </div>
              <p className="mt-1.5 max-w-4xl text-sm leading-5 text-ink/55">
                {product.description ?? "Imported product listing."}
              </p>
            </div>
          </div>

        </section>

        <section className="mt-7">
          <div className="mb-3 flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-black tracking-[-0.025em] text-forest">
                Compare offers
              </h2>
              <p className="mt-1 text-xs text-ink/45">
                Sorted by total price. Select a row for complete merchant terms.
              </p>
            </div>
            <p className="text-xs font-semibold text-ink/45">{offers.length} offers found</p>
          </div>
          <OfferComparison offers={offers} />
        </section>
      </main>
    </div>
  );
}
