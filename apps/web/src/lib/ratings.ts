import type { Offer } from "./types";

export function calculateAverageProductRating(offers: Offer[]): number | null {
  const ratedOffers = offers.filter((offer) => offer.shopProductRating !== null);

  if (ratedOffers.length === 0) return null;

  const weightedTotal = ratedOffers.reduce((total, offer) => {
    const weight = Math.max(offer.shopProductReviewCount ?? 0, 1);
    return total + Number(offer.shopProductRating) * weight;
  }, 0);
  const totalWeight = ratedOffers.reduce(
    (total, offer) => total + Math.max(offer.shopProductReviewCount ?? 0, 1),
    0,
  );

  return weightedTotal / totalWeight;
}
