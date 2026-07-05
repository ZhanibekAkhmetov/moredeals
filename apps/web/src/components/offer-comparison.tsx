"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import type {
  MoneyValue,
  Offer,
  OfferDetails,
  PriceSnapshot,
} from "@/lib/types";

const paymentLabels: Record<string, string> = {
  CREDIT_CARD: "Card",
  PAYPAL: "PayPal",
  KLARNA: "Klarna",
  BANK_TRANSFER: "Bank transfer",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  CASH_ON_DELIVERY: "Cash on delivery",
};

function formatCurrency(value: MoneyValue, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(value));
}

function formatRating(value: MoneyValue | null) {
  return value === null ? "Not rated" : `${Number(value).toFixed(1)} / 5`;
}

function formatConfidence(value: MoneyValue) {
  return `${Math.round(Number(value) * 100)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDelivery(min: number | null, max: number | null) {
  if (min === null && max === null) return "Not available";
  if (min === max || max === null) {
    const days = min ?? max;
    return `${days} business day${days === 1 ? "" : "s"}`;
  }
  return `${min ?? 0}-${max} business days`;
}

function formatPayment(method: string) {
  return paymentLabels[method] ?? method.replaceAll("_", " ").toLowerCase();
}

function offerImageUrl(offer: Offer | OfferDetails) {
  return (
    offer.imageUrl ||
    offer.variant.imageUrl ||
    offer.variant.product.imageUrl ||
    ""
  );
}

export function OfferComparison({ offers }: { offers: Offer[] }) {
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState("all");
  const variants = useMemo(
    () => Array.from(new Map(offers.map((offer) => [offer.variant.id, offer.variant])).values()),
    [offers],
  );
  const visibleOffers =
    variantId === "all"
      ? offers
      : offers.filter((offer) => offer.variant.id === variantId);

  if (offers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-forest/20 bg-white p-8 text-center">
        <p className="font-bold text-forest">No active offers yet.</p>
        <p className="mt-1 text-sm text-ink/45">Import merchant listings to compare offers.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden border border-ink/15 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-white px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-ink/55">
            <span className="mr-1">Variant:</span>
            <button
              type="button"
              aria-pressed={variantId === "all"}
              onClick={() => setVariantId("all")}
              className={`rounded-md border px-2.5 py-1.5 transition ${
                variantId === "all"
                  ? "border-forest bg-forest text-white"
                  : "border-ink/12 bg-canvas text-forest/70 hover:border-forest/30"
              }`}
            >
              All variants
            </button>
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={variantId === variant.id}
                onClick={() => setVariantId(variant.id)}
                className={`rounded-md border px-2.5 py-1.5 transition ${
                  variantId === variant.id
                    ? "border-forest bg-forest text-white"
                    : "border-ink/12 bg-canvas text-forest/70 hover:border-forest/30"
                }`}
              >
                {variant.name}
              </button>
            ))}
          </div>
          <span className="text-xs text-ink/40">
            {visibleOffers.length} imported results
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink/10 bg-mist/60 text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-ink/45">
                <th className="px-3 py-2.5">Product / store</th>
                <th className="px-3 py-2.5">Store rating</th>
                <th className="px-3 py-2.5">Item price</th>
                <th className="px-3 py-2.5">Shipping</th>
                <th className="px-3 py-2.5">Total price</th>
                <th className="px-3 py-2.5">Delivery</th>
                <th className="px-3 py-2.5">Payment</th>
                <th className="px-3 py-2.5">Returns</th>
                <th className="px-3 py-2.5">Warranty</th>
                <th className="px-3 py-2.5">Match</th>
              </tr>
            </thead>
            <tbody>
              {visibleOffers.map((offer, index) => (
                <tr
                  key={offer.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View offer from ${offer.shop.name} for ${formatCurrency(offer.totalPrice, offer.currency)}`}
                  onClick={() => setSelectedOfferId(offer.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedOfferId(offer.id);
                    }
                  }}
                  className="cursor-pointer border-b border-ink/8 text-xs transition-colors last:border-0 hover:bg-[#f5f8ef] focus-visible:bg-[#f5f8ef]"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      {offerImageUrl(offer) ? (
                        <img
                          src={offerImageUrl(offer)}
                          alt={`${offer.variant.name} offered by ${offer.shop.name}`}
                          className="size-12 shrink-0 border border-ink/15 bg-white object-contain"
                        />
                      ) : (
                        <span className="grid size-12 shrink-0 place-items-center border border-ink/15 bg-mist px-1 text-center text-[0.55rem] font-bold uppercase text-ink/40">
                          No image
                        </span>
                      )}
                      <div>
                        <p className="font-extrabold text-forest">{offer.shop.name}</p>
                        <p className="mt-0.5 max-w-32 truncate text-[0.65rem] text-ink/40">
                          {offer.variant.name}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[0.55rem] font-bold uppercase ${
                            offer.source === "IMPORTED_FEED"
                              ? "bg-lime/35 text-forest"
                              : "bg-mist text-ink/45"
                          }`}
                          title={offer.sourceName ?? undefined}
                        >
                          {offer.sourceName || "Imported feed"}
                        </span>
                        {index === 0 && variantId === "all" && (
                          <span className="mt-1 inline-block text-[0.58rem] font-bold uppercase text-coral">
                            Lowest total
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-bold text-ink/75">
                      <span className="text-coral">★</span> {formatRating(offer.shop.trustpilotRating)}
                    </p>
                    <p className="mt-0.5 text-[0.65rem] text-ink/40">
                      {formatNumber(offer.shop.trustpilotReviewCount ?? 0)} reviews
                    </p>
                  </td>
                  <td className="px-3 py-3 font-semibold text-ink/65">
                    {formatCurrency(offer.price, offer.currency)}
                  </td>
                  <td className="px-3 py-3 text-ink/55">
                    {Number(offer.shippingCost) === 0
                      ? "Free"
                      : formatCurrency(offer.shippingCost, offer.currency)}
                  </td>
                  <td className="px-3 py-3 text-sm font-black text-forest">
                    {formatCurrency(offer.totalPrice, offer.currency)}
                  </td>
                  <td className="px-3 py-3 font-semibold text-ink/65">
                    {formatDelivery(offer.deliveryMinDays, offer.deliveryMaxDays)}
                  </td>
                  <td className="max-w-36 px-3 py-3 leading-5 text-ink/60">
                    {offer.paymentMethods.map(formatPayment).join(", ")}
                  </td>
                  <td className="px-3 py-3 font-semibold text-ink/65">
                    {offer.shop.returnPolicy
                      ? `${offer.shop.returnPolicy.returnPeriodDays} days`
                      : "Ask seller"}
                  </td>
                  <td className="px-3 py-3 font-semibold text-ink/65">
                    {offer.warrantyInfo
                      ? `${offer.warrantyInfo.durationMonths} months`
                      : "Ask seller"}
                  </td>
                  <td className="px-3 py-3">
                    <span className="border border-forest/15 bg-lime/40 px-2 py-1 font-extrabold text-forest">
                      {formatConfidence(offer.matchConfidence)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-ink/10 bg-canvas/50 px-3 py-2 text-[0.65rem] text-ink/45">
          <span>Sorted by total price, including shipping.</span>
          <span className="font-bold text-forest/60">Select a row for details</span>
        </div>
      </div>

      {selectedOfferId && (
        <OfferDrawer
          offerId={selectedOfferId}
          onClose={() => setSelectedOfferId(null)}
        />
      )}
    </>
  );
}

function OfferDrawer({ offerId, onClose }: { offerId: string; onClose: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [history, setHistory] = useState<PriceSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refreshOffer() {
    if (!offer || isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const result = await api.refreshOffer(offer.id);
      setOffer(result.offer);
      setHistory((current) =>
        [...current, result.snapshot].sort(
          (left, right) =>
            new Date(left.capturedAt).getTime() -
            new Date(right.capturedAt).getTime(),
        ),
      );
      router.refresh();
    } catch (reason) {
      setRefreshError(
        reason instanceof Error ? reason.message : "Offer refresh failed.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    Promise.all([api.getOffer(offerId), api.getPriceHistory(offerId)])
      .then(([offerData, historyData]) => {
        if (!active) return;
        setOffer(offerData);
        setHistory(historyData);
      })
      .catch(() => {
        if (active) setError("Offer details could not be loaded. Please try again.");
      });

    return () => {
      active = false;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [offerId, onClose]);

  const chartData = history.map((snapshot) => ({
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(snapshot.capturedAt)),
    total: Number(snapshot.totalPrice),
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-forest/40 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-title"
        className="drawer-enter h-full w-full max-w-[720px] overflow-y-auto bg-canvas shadow-[-15px_0_45px_rgba(10,35,25,0.18)]"
      >
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-ink/10 bg-white/95 px-4 backdrop-blur sm:px-5">
          <div className="flex items-center gap-2.5">
            <p className="text-sm font-black text-forest">Offer details</p>
            <span
              className={`rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase ${
                offer?.source === "IMPORTED_FEED"
                  ? "bg-lime/35 text-forest"
                  : "border border-coral/20 bg-coral/5 text-coral"
              }`}
            >
              {offer?.sourceName || "Imported feed"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {offer && user?.role === "ADMIN" && (
              <button
                type="button"
                disabled={isRefreshing}
                onClick={() => void refreshOffer()}
                className="border border-ink/20 bg-white px-2.5 py-1.5 text-[0.68rem] font-bold text-forest hover:bg-mist disabled:opacity-45"
              >
                {isRefreshing ? "Refreshing..." : "Refresh offer"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              autoFocus
              aria-label="Close offer details"
              className="grid size-8 place-items-center rounded-md border border-ink/10 bg-white text-lg text-forest hover:bg-mist"
            >
              ×
            </button>
          </div>
        </div>

        {!offer && !error && <DrawerLoading />}

        {error && (
          <div className="m-4 rounded-lg border border-coral/25 bg-coral/10 p-4 text-sm font-semibold text-forest">
            {error}
          </div>
        )}

        {refreshError && (
          <div className="mx-4 mt-4 border border-coral/30 bg-white px-3 py-2 text-xs font-semibold text-coral sm:mx-5">
            {refreshError}
          </div>
        )}

        {offer && (
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                {offerImageUrl(offer) ? (
                  <img
                    src={offerImageUrl(offer)}
                    alt={`${offer.variant.name} offered by ${offer.shop.name}`}
                    className="size-16 shrink-0 border border-ink/15 bg-white object-contain"
                  />
                ) : (
                  <span className="grid size-16 shrink-0 place-items-center border border-ink/15 bg-mist px-1 text-center text-[0.58rem] font-bold uppercase text-ink/40">
                    No image
                  </span>
                )}
                <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-coral">{offer.shop.name}</p>
                  <span className="text-xs text-ink/35">·</span>
                  <p className="text-xs text-ink/45">{offer.variant.name}</p>
                </div>
                <h2 id="offer-title" className="mt-1 text-lg font-black text-forest">
                  {offer.variant.product.name}
                </h2>
                <p className="mt-1 text-xs text-ink/45">
                  {formatCurrency(offer.price, offer.currency)} item + {Number(offer.shippingCost) === 0 ? "free shipping" : `${formatCurrency(offer.shippingCost, offer.currency)} shipping`}
                </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:text-right">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-wide text-ink/40">Total</p>
                  <p className="text-2xl font-black text-forest">
                    {formatCurrency(offer.totalPrice, offer.currency)}
                  </p>
                </div>
                <a
                  href={offer.redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-coral px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#df5b40]"
                >
                  Go to seller ↗
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-ink/10 bg-white sm:grid-cols-4">
              <DetailCell label="Delivery" value={formatDelivery(offer.deliveryMinDays, offer.deliveryMaxDays)} />
              <DetailCell label="Match confidence" value={formatConfidence(offer.matchConfidence)} />
              <DetailCell label="Product rating" value={`★ ${formatRating(offer.shopProductRating)}`} detail={`${offer.shopProductReviewCount ?? 0} reviews at this store`} />
              <DetailCell label="Store rating" value={`★ ${formatRating(offer.shop.trustpilotRating)}`} detail={`${formatNumber(offer.shop.trustpilotReviewCount ?? 0)} reviews`} />
              <DetailCell label="Payment" value={offer.paymentMethods.map(formatPayment).join(", ")} />
              <DetailCell
                label="Returns"
                value={offer.shop.returnPolicy ? `${offer.shop.returnPolicy.returnPeriodDays} days` : "Ask seller"}
                detail={offer.shop.returnPolicy ? `${offer.shop.returnPolicy.returnShippingPaidBy === "SHOP" ? "Seller" : "Customer"} pays return shipping` : undefined}
              />
              <DetailCell
                label="Warranty"
                value={offer.warrantyInfo ? `${offer.warrantyInfo.durationMonths} months` : "Ask seller"}
                detail={offer.warrantyInfo ? `${offer.warrantyInfo.type} · ${offer.warrantyInfo.provider}` : undefined}
              />
              <DetailCell label="Availability" value={offer.stockStatus.replaceAll("_", " ").toLowerCase()} />
            </div>

            <section className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-ink/15 bg-white px-3 py-2 text-[0.68rem]">
              <span className="font-bold uppercase tracking-wide text-ink/45">
                Last checked
              </span>
              <span className="font-semibold text-forest">
                {offer.lastCheckedAt
                  ? new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(offer.lastCheckedAt))
                  : "Not refreshed yet"}
              </span>
              {offer.lastExtractionStatus && (
                <span
                  className={`border px-1.5 py-0.5 font-bold uppercase ${
                    offer.lastExtractionStatus === "SUCCESS"
                      ? "border-forest/20 bg-lime/35 text-forest"
                      : offer.lastExtractionStatus === "PARTIAL"
                        ? "border-amber-500/30 bg-amber-50 text-amber-800"
                        : "border-coral/30 bg-red-50 text-coral"
                  }`}
                >
                  {offer.lastExtractionStatus}
                </span>
              )}
              {offer.lastExtractionStatus &&
                offer.lastExtractionStatus !== "SUCCESS" &&
                offer.lastExtractionWarnings.length > 0 && (
                  <span
                    className="min-w-0 flex-1 truncate text-coral"
                    title={offer.lastExtractionWarnings.join(" ")}
                  >
                    {offer.lastExtractionWarnings.join(" ")}
                  </span>
                )}
            </section>

            <section className="rounded-xl border border-ink/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-forest">Price history</h3>
                <span className="text-[0.65rem] text-ink/40">{history.length} snapshots · total price</span>
              </div>
              <div className="mt-2 h-40 w-full" aria-label="Price history line chart">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e4e8e1" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#68736d", fontSize: 10 }} />
                      <YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fill: "#68736d", fontSize: 10 }} />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value), offer.currency), "Total"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #dfe5dc", fontSize: 12 }}
                      />
                      <Line type="monotone" dataKey="total" stroke="#ef6b4f" strokeWidth={2.5} dot={{ fill: "#c9f45a", stroke: "#143d2e", strokeWidth: 1.5, r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center bg-canvas text-xs text-ink/45">No price history available.</div>
                )}
              </div>
            </section>

            {(offer.shop.returnPolicy?.returnShippingDetails || offer.warrantyInfo?.details) && (
              <section className="grid gap-3 rounded-xl border border-ink/10 bg-white p-4 text-xs leading-5 text-ink/55 sm:grid-cols-2">
                <div>
                  <p className="font-bold text-forest">Return details</p>
                  <p className="mt-1">{offer.shop.returnPolicy?.returnShippingDetails ?? "Confirm terms with the seller."}</p>
                </div>
                <div>
                  <p className="font-bold text-forest">Warranty details</p>
                  <p className="mt-1">{offer.warrantyInfo?.details ?? "Confirm coverage with the seller."}</p>
                </div>
              </section>
            )}

            <p className="text-center text-[0.65rem] text-ink/40">
              Only “Go to seller” leaves MoreDeals. Listing source: {offer.sourceName || "Imported feed"}.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function DetailCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-h-20 border-b border-r border-ink/8 p-3 sm:min-h-24">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-ink/40">{label}</p>
      <p className="mt-1 text-xs font-extrabold leading-4 text-forest">{value}</p>
      {detail && <p className="mt-1 text-[0.62rem] leading-4 text-ink/40">{detail}</p>}
    </div>
  );
}

function DrawerLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4 sm:p-5">
      <div className="h-24 rounded-xl bg-white" />
      <div className="h-48 rounded-xl bg-white" />
      <div className="h-48 rounded-xl bg-white" />
    </div>
  );
}
