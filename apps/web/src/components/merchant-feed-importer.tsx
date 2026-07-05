"use client";

import { ChangeEvent, useState } from "react";
import { API_URL, api } from "@/lib/api";
import type { MerchantFeedImportSummary } from "@/lib/types";
import type { RefreshImportedSummary } from "@/lib/types";

export function MerchantFeedImporter() {
  const [sourceName, setSourceName] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [summary, setSummary] = useState<MerchantFeedImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy template");
  const [refreshSummary, setRefreshSummary] = useState<RefreshImportedSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refreshImportedOffers() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    setRefreshSummary(null);
    try {
      setRefreshSummary(await api.refreshImportedOffers());
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Imported offer refresh failed.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsvText(await file.text());
    setSummary(null);
    setError(null);
  }

  async function copyTemplate() {
    try {
      const template = await api.getMerchantFeedTemplate();
      await navigator.clipboard.writeText(template);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy template"), 1600);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not copy the template.",
      );
    }
  }

  async function importFeed() {
    if (!sourceName.trim() || !csvText.trim() || isImporting) return;
    setIsImporting(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(await api.importMerchantFeed(sourceName.trim(), csvText));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The feed import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 border border-ink/15 bg-white p-3">
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.07em] text-forest">
            Refresh imported offers
          </h2>
          <p className="mt-1 text-[0.68rem] text-ink/45">
            Checks stored listing URLs sequentially with a delay between requests.
          </p>
        </div>
        <button
          type="button"
          disabled={isRefreshing}
          onClick={() => void refreshImportedOffers()}
          className="bg-forest px-3 py-2 text-xs font-bold text-white disabled:opacity-45"
        >
          {isRefreshing ? "Refreshing imported offers..." : "Refresh all imported offers"}
        </button>
        {refreshSummary && (
          <div className="basis-full border-t border-ink/10 pt-2 text-xs text-ink/60">
            {refreshSummary.attempted} attempted · {refreshSummary.succeeded} succeeded · {refreshSummary.partial} partial · {refreshSummary.failed} failed
            {refreshSummary.errors.map((refreshError) => (
              <p key={`${refreshError.offerId}-${refreshError.message}`} className="mt-1 text-coral">
                {refreshError.offerId}: {refreshError.message}
              </p>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="border border-ink/15 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/8 pb-4">
          <div>
            <h2 className="text-base font-black text-forest">CSV feed</h2>
            <p className="mt-1 text-xs leading-5 text-ink/45">
              Upload a manually curated merchant export. Imported rows are stored
              as offers and price snapshots.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void copyTemplate()}
              className="rounded-md border border-ink/15 px-3 py-2 text-xs font-bold text-forest hover:bg-mist"
            >
              {copyLabel}
            </button>
            <a
              href={`${API_URL}/merchant-feeds/template`}
              className="rounded-md border border-ink/15 px-3 py-2 text-xs font-bold text-forest hover:bg-mist"
            >
              Download template
            </a>
          </div>
        </div>

        <label className="mt-4 block text-xs font-bold text-ink/60" htmlFor="source-name">
          Source name
        </label>
        <input
          id="source-name"
          value={sourceName}
          onChange={(event) => setSourceName(event.target.value)}
          placeholder="e.g. MediaMarkt manual feed — July 2026"
          className="mt-1.5 h-10 w-full rounded-lg border border-ink/15 bg-canvas px-3 text-sm outline-none focus:border-forest/40"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg bg-forest px-4 py-2.5 text-sm font-bold text-white hover:bg-forest/90">
            Select CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void handleFile(event)}
              className="sr-only"
            />
          </label>
          <span className="text-xs text-ink/45">
            {fileName ?? "No file selected"}
          </span>
        </div>

        <label className="mt-4 block text-xs font-bold text-ink/60" htmlFor="csv-preview">
          CSV preview
        </label>
        <textarea
          id="csv-preview"
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          placeholder="Select a CSV file or paste CSV text here."
          spellCheck={false}
          className="mt-1.5 h-64 w-full resize-y rounded-lg border border-ink/15 bg-[#fbfcf8] p-3 font-mono text-[0.68rem] leading-5 text-ink/70 outline-none focus:border-forest/40"
        />

        {error && (
          <div className="mt-3 rounded-lg border border-coral/25 bg-coral/8 px-3 py-2.5 text-xs font-semibold text-forest">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[0.68rem] leading-5 text-ink/40">
            Imports run immediately. Successful rows are committed independently;
            automatic scheduling is not enabled.
          </p>
          <button
            type="button"
            disabled={!sourceName.trim() || !csvText.trim() || isImporting}
            onClick={() => void importFeed()}
            className="shrink-0 rounded-lg bg-coral px-5 py-2.5 text-sm font-black text-white hover:bg-[#df5b40] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isImporting ? "Importing..." : "Import feed"}
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="border border-ink/15 bg-white p-4">
          <h2 className="text-sm font-black text-forest">Import result</h2>
          {!summary ? (
            <p className="mt-2 text-xs leading-5 text-ink/45">
              Results and row validation errors will appear here after import.
            </p>
          ) : (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <ResultMetric label="Imported rows" value={summary.importedRows} />
                <ResultMetric label="Failed rows" value={summary.failedRows} />
                <ResultMetric label="Created offers" value={summary.createdOffers} />
                <ResultMetric label="Updated offers" value={summary.updatedOffers} />
                <ResultMetric label="Price snapshots" value={summary.priceSnapshotsCreated} />
              </dl>
              <p className="mt-3 break-all text-[0.62rem] text-ink/35">
                Import ID: {summary.importId}
              </p>
            </>
          )}
        </section>

        {summary && summary.errors.length > 0 && (
          <section className="border border-coral/30 bg-white p-4">
            <h2 className="text-sm font-black text-forest">Row errors</h2>
            <ul className="mt-2 space-y-2">
              {summary.errors.map((rowError) => (
                <li key={`${rowError.row}-${rowError.message}`} className="rounded-md bg-coral/8 p-2 text-xs leading-5 text-ink/65">
                  <span className="font-bold text-coral">Row {rowError.row}:</span>{" "}
                  {rowError.message}
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
      </div>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-canvas p-2.5">
      <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className="mt-1 text-lg font-black text-forest">{value}</dd>
    </div>
  );
}
