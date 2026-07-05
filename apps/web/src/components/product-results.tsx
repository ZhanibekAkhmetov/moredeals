"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";

export type ProductResult = Product & {
  averageRating: number | null;
  offerCount: number;
};

const formatNumber = new Intl.NumberFormat("en-US");

export function ProductResults({ products }: { products: ProductResult[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        [
          product.name,
          product.brand,
          product.category,
          ...product.variants.flatMap((variant) => [variant.name, variant.color]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery, products],
  );

  return (
    <>
      <div className="border border-ink/20 bg-white p-3">
        <label htmlFor="product-search" className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-ink/50">
          Search products
        </label>
        <div className="flex gap-2">
          <input
            id="product-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Phone, brand, storage, or color"
            className="h-9 min-w-0 flex-1 border border-ink/20 bg-canvas px-3 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-forest"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="border border-ink/20 bg-white px-3 text-xs font-bold text-forest hover:bg-mist"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.04em] text-forest">
          {normalizedQuery ? "Search results" : "Available smartphones"}
        </h2>
        <p className="text-xs text-ink/45">
          {formatNumber.format(filteredProducts.length)} products
        </p>
      </div>

      <div className="mt-2 overflow-x-auto border border-ink/15 bg-white">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-ink/15 bg-mist/70 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-ink/50">
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Brand</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Average rating</th>
              <th className="px-3 py-2">Variants</th>
              <th className="px-3 py-2">Offers</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-b border-ink/10 last:border-0 hover:bg-canvas/70">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="size-12 shrink-0 border border-ink/15 bg-white object-contain" />
                    ) : (
                      <span className="grid size-12 shrink-0 place-items-center border border-ink/15 bg-mist text-[0.65rem] font-black text-forest">
                        {product.brand.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-extrabold text-forest">{product.name}</p>
                      <p className="mt-0.5 max-w-md truncate text-[0.68rem] text-ink/45">
                        {product.description ?? "Smartphone comparison"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 font-semibold text-ink/70">{product.brand}</td>
                <td className="px-3 py-3 capitalize text-ink/60">{product.category}</td>
                <td className="px-3 py-3 text-ink/65">
                  {product.averageRating === null ? "Not rated" : `★ ${product.averageRating.toFixed(1)} / 5`}
                </td>
                <td className="px-3 py-3 text-ink/65">{formatNumber.format(product.variants.length)}</td>
                <td className="px-3 py-3 text-ink/65">{formatNumber.format(product.offerCount)}</td>
                <td className="px-3 py-3 text-right">
                  <Link href={`/products/${product.id}`} className="inline-block bg-forest px-3 py-2 font-bold text-white hover:bg-forest/90">
                    Compare offers
                  </Link>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink/50">
                  {products.length === 0
                    ? "No imported products yet. Login as admin and import merchant feed rows."
                    : "No matching smartphones. Try a brand, storage size, or color."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
