import type {
  Offer,
  OfferDetails,
  MerchantFeedImportSummary,
  AuthUser,
  FeedBuilderExtraction,
  OfferRefreshResult,
  PriceSnapshot,
  Product,
  RefreshImportedSummary,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    let message = `API request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(" ");
      else if (body.message) message = body.message;
    } catch {
      // Keep the status-based fallback for non-JSON upstream errors.
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getProducts: () => request<Product[]>("/products"),
  getProduct: (id: string) => request<Product>(`/products/${id}`),
  getProductOffers: (id: string) =>
    request<Offer[]>(`/products/${id}/offers`),
  getOffer: (id: string) => request<OfferDetails>(`/offers/${id}`),
  getPriceHistory: (id: string) =>
    request<PriceSnapshot[]>(`/offers/${id}/price-history`),
  refreshOffer: (id: string) =>
    request<OfferRefreshResult>(`/offers/${id}/refresh`, { method: "POST" }),
  refreshImportedOffers: () =>
    request<RefreshImportedSummary>("/offers/refresh-imported", {
      method: "POST",
    }),
  getMerchantFeedTemplate: async () => {
    const response = await fetch(`${API_URL}/merchant-feeds/template`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new ApiError(
        `Template request failed with status ${response.status}.`,
        response.status,
      );
    }
    return response.text();
  },
  importMerchantFeed: (sourceName: string, csvText: string) =>
    request<MerchantFeedImportSummary>("/merchant-feeds/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceName, csvText }),
    }),
  register: (name: string, email: string, password: string) =>
    request<AuthUser>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<AuthUser>("/auth/me"),
  logout: () =>
    request<{ success: boolean }>("/auth/logout", { method: "POST" }),
  extractFeedUrls: (urls: string[]) =>
    request<FeedBuilderExtraction[]>("/feed-builder/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    }),
};
