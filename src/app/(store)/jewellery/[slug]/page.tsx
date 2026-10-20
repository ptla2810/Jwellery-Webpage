import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryScope } from "@/lib/catalog/queries";
import type { SearchParamsRecord } from "@/lib/catalog/filters";
import { ListingView } from "@/components/listing/ListingView";
import { breadcrumbJsonLd, JsonLd, listingCanonical } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParamsRecord> };

const KIND_LABEL = { TYPE: "Jewellery", MATERIAL: "Shop by metal", OCCASION: "Shop by occasion" } as const;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const scope = await getCategoryScope((await params).slug);
  if (!scope) return { title: "Not found", robots: { index: false } };
  const c = scope.category;
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return {
    title: c.seoTitle ?? `${c.name} Jewellery`,
    description: c.seoDescription ?? c.description ?? undefined,
    alternates: { canonical: listingCanonical(`/jewellery/${c.slug}`, sp) },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title: c.name, description: c.description ?? undefined, images: c.imageUrl ? [c.imageUrl] : undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const scope = await getCategoryScope((await params).slug);
  if (!scope) notFound();
  const c = scope.category;
  const crumbs = [
    { label: "Home", href: "/" },
    { label: KIND_LABEL[c.kind], href: "/shop" },
    ...(c.parent ? [{ label: c.parent.name, href: `/jewellery/${c.parent.slug}` }] : []),
    { label: c.name, href: `/jewellery/${c.slug}` },
  ];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <ListingView
        title={c.kind === "TYPE" ? c.name : `${c.name}${c.kind === "MATERIAL" && !/jewellery/i.test(c.name) ? " Jewellery" : ""}`}
        eyebrow={KIND_LABEL[c.kind]}
        description={c.description}
        bannerUrl={c.bannerUrl}
        basePath={`/jewellery/${c.slug}`}
        breadcrumbs={crumbs}
        base={scope.where}
        searchParams={await searchParams}
        hide={{ type: c.kind === "TYPE" && c.children.length === 0, material: c.kind === "MATERIAL", occasion: c.kind === "OCCASION" }}
      />
    </>
  );
}
