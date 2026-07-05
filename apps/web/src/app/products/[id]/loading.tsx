import { SiteHeader } from "@/components/site-header";

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-7xl animate-pulse px-5 py-12 sm:px-8">
        <div className="h-5 w-32 rounded bg-forest/10" />
        <div className="mt-8 h-48 border border-ink/10 bg-white" />
        <div className="mt-14 h-10 w-72 rounded bg-forest/10" />
        <div className="mt-8 h-80 border border-ink/10 bg-white" />
      </main>
    </div>
  );
}
