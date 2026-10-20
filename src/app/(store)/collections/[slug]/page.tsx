import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionScope } from "@/lib/catalog/queries";
import type { SearchParamsRecord } from "@/lib/catalog/filters";
import { ListingView } from "@/components/listing/ListingView";
import { breadcrumbJsonLd, JsonLd, listingCanonical } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParamsRecord> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const scope = await getCollectionScope((await params).slug);
  if (!scope) return { title: "Not found", robots: { index: false } };
  const c = scope.collection;
  const sp = await searchParams;
  return {
    title: c.seoTitle ?? c.name,
    description: c.seoDescription ?? c.description ?? undefined,
    alternates: { canonical: listingCanonical(`/collections/${c.slug}`, sp) },
    robots: Object.keys(sp).some((k) => k !== "page") ? { index: false, follow: true } : undefined,
    openGraph: { title: c.name, description: c.description ?? undefined, images: c.imageUrl ? [c.imageUrl] : undefined },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const scope = await getCollectionScope((await params).slug);
  if (!scope) notFound();
  const c = scope.collection;
  const crumbs = [{ label: "Home", href: "/" }, { label: "Collections", href: "/collections" }, { label: c.name, href: `/collections/${c.slug}` }];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <ListingView title={c.name} eyebrow="Collection" description={c.description} bannerUrl={c.bannerUrl} basePath={`/collections/${c.slug}`} breadcrumbs={crumbs} base={scope.where} searchParams={await searchParams} />
    </>
  );
}
