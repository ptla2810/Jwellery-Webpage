import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/ui/misc";
import { ProductImage } from "@/components/ui/ProductImage";

export const metadata: Metadata = { title: "Collections", description: "Explore our curated jewellery collections.", alternates: { canonical: "/collections" } };
export const dynamic = "force-dynamic";

export default async function CollectionsIndex() {
  const collections = await prisma.collection.findMany({ where: { isPublished: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <div className="container-x pt-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections" }]} />
      <h1 className="mt-4 text-4xl md:text-5xl">Collections</h1>
      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {collections.map((c) => (
          <li key={c.id}>
            <Link href={`/collections/${c.slug}`} className="group block">
              <span className="relative block aspect-[4/5] overflow-hidden bg-cream">
                {c.imageUrl && <ProductImage src={c.imageUrl} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
              </span>
              <span className="mt-3 block font-display text-xl group-hover:text-gold">{c.name}</span>
              {c.description && <span className="mt-1 block text-sm text-muted">{c.description}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
