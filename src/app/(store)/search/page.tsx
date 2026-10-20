import type { Metadata } from "next";
import Link from "next/link";
import type { SearchParamsRecord } from "@/lib/catalog/filters";
import { ListingView } from "@/components/listing/ListingView";
import { getNavigation } from "@/lib/catalog/queries";

type Props = { searchParams: Promise<SearchParamsRecord> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q;
  return { title: q ? `Search: ${String(q).slice(0, 60)}` : "Search", robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  if (!q) {
    const nav = await getNavigation();
    return (
      <div className="container-x py-16">
        <h1 className="text-4xl">Search</h1>
        <p className="mt-3 text-muted">Use the search bar above to find jewellery by name, SKU, metal or stone. Or start with a category:</p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {nav.types.map((c) => (
            <li key={c.slug}><Link href={`/jewellery/${c.slug}`} className="block rounded-full border border-line px-4 py-2 text-sm hover:border-gold">{c.name}</Link></li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ListingView
      title={`Results for “${q}”`}
      basePath="/search"
      clearHref={`/search?q=${encodeURIComponent(q)}`}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Search" }]}
      base={{}}
      searchParams={sp}
    />
  );
}
