import type { Metadata } from "next";
import type { SearchParamsRecord } from "@/lib/catalog/filters";
import { ListingView } from "@/components/listing/ListingView";
import { listingCanonical } from "@/lib/seo";

type Props = { searchParams: Promise<SearchParamsRecord> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: "All Jewellery",
    description: "Browse our complete collection of gold, diamond, platinum and silver jewellery.",
    alternates: { canonical: listingCanonical("/shop", sp) },
    robots: Object.keys(sp).some((k) => k !== "page") ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: Props) {
  return (
    <ListingView
      title="All jewellery"
      description="Every design in our studio — filter by metal, stone, price or occasion."
      basePath="/shop"
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "All jewellery", href: "/shop" }]}
      base={{}}
      searchParams={await searchParams}
    />
  );
}
