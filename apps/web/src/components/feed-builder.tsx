"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
  merchantFeedColumns,
  merchantFeedRequiredColumns,
  rowsToMerchantCsv,
} from "@/lib/merchant-feed";
import type {
  FeedBuilderExtraction,
  MerchantFeedImportSummary,
  MerchantFeedRow,
} from "@/lib/types";

export function FeedBuilder() {
  const [urlText, setUrlText] = useState("");
  const [results, setResults] = useState<FeedBuilderExtraction[]>([]);
  const [sourceName, setSourceName] = useState("Feed Builder manual import");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MerchantFeedImportSummary | null>(null);

  const urls = Array.from(
    new Set(
      urlText
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );
  const rowsAreImportable =
    results.length > 0 &&
    results.every((result) =>
      Array.from(merchantFeedRequiredColumns).every((column) => result.row[column].trim()),
    );

  async function extract() {
    if (!urls.length || isExtracting) return;
    setIsExtracting(true);
    setError(null);
    setSummary(null);
    try {
      setResults(await api.extractFeedUrls(urls));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  }

  function updateCell(rowIndex: number, column: keyof MerchantFeedRow, value: string) {
    setResults((current) =>
      current.map((result, index) =>
        index === rowIndex
          ? { ...result, row: { ...result.row, [column]: value } }
          : result,
      ),
    );
  }

  function exportCsv() {
    const csv = rowsToMerchantCsv(results.map((result) => result.row));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "moredeals-feed-builder.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importRows() {
    if (!results.length || !sourceName.trim() || isImporting) return;
    setIsImporting(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(
        await api.importMerchantFeed(
          sourceName.trim(),
          rowsToMerchantCsv(results.map((result) => result.row)),
        ),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Feed import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="border border-ink/15 bg-white p-4">
        <label htmlFor="feed-urls" className="text-xs font-bold uppercase tracking-[0.06em] text-ink/60">
          Product URLs · one per line · maximum 20
        </label>
        <textarea
          id="feed-urls"
          value={urlText}
          onChange={(event) => setUrlText(event.target.value)}
          placeholder={"https://shop.example/product-one\nhttps://shop.example/product-two"}
          className="mt-2 h-28 w-full resize-y border border-ink/20 bg-canvas p-3 font-mono text-xs leading-5 outline-none focus:border-forest"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[0.68rem] leading-4 text-ink/50">
            <p>Extraction is best-effort. Some stores hide price/product data behind JavaScript or bot protection.</p>
            <p>EAN/GTIN/MPN improves matching but is optional. Review rows before importing.</p>
            <p>Only submitted URLs are fetched. No crawling, discovery, or scheduled requests.</p>
          </div>
          <button
            type="button"
            disabled={!urls.length || urls.length > 20 || isExtracting}
            onClick={() => void extract()}
            className="bg-forest px-4 py-2.5 text-xs font-bold text-white disabled:opacity-45"
          >
            {isExtracting ? "Extracting..." : `Extract listings (${urls.length})`}
          </button>
        </div>
      </section>

      {error && (
        <p className="border border-coral/30 bg-white px-3 py-2.5 text-xs font-semibold text-coral">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <section className="border border-ink/15 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 bg-mist/60 px-3 py-2.5">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-[0.07em] text-forest">
                Editable feed rows
              </h2>
              <p className="mt-0.5 text-[0.65rem] text-ink/45">
                Empty cells are highlighted. Required import fields use the stronger warning color.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                aria-label="Import source name"
                className="h-8 w-56 border border-ink/20 bg-white px-2 text-xs outline-none focus:border-forest"
              />
              <button type="button" onClick={exportCsv} className="border border-ink/25 bg-white px-3 py-2 text-xs font-bold text-forest hover:bg-mist">
                Export CSV
              </button>
              <button
                type="button"
                disabled={!sourceName.trim() || !rowsAreImportable || isImporting}
                onClick={() => void importRows()}
                title={rowsAreImportable ? "Import edited rows" : "Complete all required fields before importing"}
                className="bg-forest px-3 py-2 text-xs font-bold text-white disabled:opacity-45"
              >
                {isImporting ? "Importing..." : "Import directly"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-ink/15 bg-white text-[0.6rem] font-bold uppercase tracking-[0.05em] text-ink/50">
                  <th className="sticky left-0 z-10 min-w-48 border-r border-ink/15 bg-white px-2 py-2">Extraction</th>
                  {merchantFeedColumns.map((column) => (
                    <th key={column} className="min-w-36 border-r border-ink/10 px-2 py-2">
                      {column}
                      {merchantFeedRequiredColumns.has(column) && <span className="ml-1 text-coral">*</span>}
                      {(["ean", "gtin", "mpn"] as string[]).includes(column) && (
                        <span className="ml-1 normal-case text-ink/35">optional</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((result, rowIndex) => (
                  <tr key={`${result.url}-${rowIndex}`} className="border-b border-ink/10 align-top last:border-0">
                    <td className="sticky left-0 z-10 border-r border-ink/15 bg-white p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`border px-1.5 py-0.5 text-[0.58rem] font-bold uppercase ${
                          result.status === "SUCCESS"
                            ? "border-forest/20 bg-lime/35 text-forest"
                            : result.status === "PARTIAL"
                              ? "border-amber-500/30 bg-amber-50 text-amber-800"
                              : "border-coral/30 bg-red-50 text-coral"
                        }`}>{result.status}</span>
                        <span className="text-[0.58rem] text-ink/40">{Math.round(result.confidence * 100)}%</span>
                      </div>
                      <p className="mt-1 max-w-44 truncate font-semibold text-forest" title={result.originalUrl}>{result.originalUrl}</p>
                      {result.resolvedUrl !== result.originalUrl && (
                        <p className="mt-0.5 max-w-44 truncate text-[0.6rem] text-ink/40" title={result.resolvedUrl}>Resolved: {result.resolvedUrl}</p>
                      )}
                      {result.strategies.length > 0 && (
                        <p className="mt-1 text-[0.62rem] leading-4 text-ink/45">Used: {result.strategies.join(", ")}</p>
                      )}
                      {Object.entries(result.extractedFields).some(([, source]) => source === "derived") && (
                        <p className="mt-1 text-[0.62rem] leading-4 text-forest/70">
                          Derived from title: {Object.entries(result.extractedFields)
                            .filter(([, source]) => source === "derived")
                            .map(([field]) => field)
                            .join(", ")}
                        </p>
                      )}
                      {result.warnings.map((warning) => (
                        <p key={warning} className="mt-1 text-[0.62rem] leading-4 text-coral">{warning}</p>
                      ))}
                    </td>
                    {merchantFeedColumns.map((column) => {
                      const value = result.row[column];
                      const missingClass = value
                        ? "bg-white"
                        : merchantFeedRequiredColumns.has(column)
                          ? "bg-[#fff0ee]"
                          : "bg-[#fff9e8]";
                      return (
                        <td key={column} className="border-r border-ink/10 p-1">
                          {column === "imageUrl" && value && (
                            <img
                              src={value}
                              alt="Imported product preview"
                              className="mb-1 size-12 border border-ink/15 bg-white object-contain"
                            />
                          )}
                          <input
                            value={value}
                            onChange={(event) => updateCell(rowIndex, column, event.target.value)}
                            placeholder={
                              column === "color"
                                ? "Missing color — URL-only match"
                                : "Missing"
                            }
                            title={`${column} for row ${rowIndex + 1}`}
                            className={`h-8 w-full min-w-32 border border-transparent px-2 text-[0.68rem] outline-none focus:border-forest ${missingClass}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {summary && (
        <section className="border border-ink/15 bg-white p-4 text-xs">
          <h2 className="font-extrabold text-forest">Import result</h2>
          <p className="mt-2 text-ink/60">
            {summary.importedRows} imported · {summary.failedRows} failed · {summary.createdOffers} created · {summary.updatedOffers} updated · {summary.priceSnapshotsCreated} snapshots
          </p>
          {summary.errors.map((rowError) => (
            <p key={`${rowError.row}-${rowError.message}`} className="mt-1 text-coral">
              Row {rowError.row}: {rowError.message}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
