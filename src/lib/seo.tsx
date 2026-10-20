import { siteUrl } from "./env";

export function absoluteUrl(path: string) {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function breadcrumbJsonLd(items: { label: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: absoluteUrl(it.href) } : {}),
    })),
  };
}

/** Safely embed JSON-LD (escapes "<" to prevent breaking out of the script tag). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Filtered/sorted variants of a listing should canonicalise to the clean listing URL (except pagination). */
export function listingCanonical(path: string, sp: Record<string, string | string[] | undefined>) {
  const page = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  return page > 1 ? `${path}?page=${page}` : path;
}
