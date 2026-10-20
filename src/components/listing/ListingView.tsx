import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { listProducts, productCards } from "@/lib/catalog/queries";
import { filtersToQuery, parseFilters, type SearchParamsRecord } from "@/lib/catalog/filters";
import { ProductGrid } from "@/components/product/ProductCard";
import { Breadcrumbs, EmptyState, Pagination } from "@/components/ui/misc";
import { ProductImage } from "@/components/ui/ProductImage";
import { ButtonLink } from "@/components/ui/Button";
import { ActiveFilterChips, FilterSidebar, MobileFilters, SortSelect } from "./FilterPanel";

export async function ListingView({
  title,
  description,
  bannerUrl,
  basePath,
  breadcrumbs,
  base,
  searchParams,
  hide,
  eyebrow,
  clearHref,
}: {
  clearHref?: string;
  title: string;
  description?: string | null;
  bannerUrl?: string | null;
  basePath: string;
  breadcrumbs: { label: string; href?: string }[];
  base: Prisma.ProductWhereInput;
  searchParams: SearchParamsRecord;
  hide?: { type?: boolean; material?: boolean; occasion?: boolean };
  eyebrow?: string;
}) {
  const filters = parseFilters(searchParams);
  const result = await listProducts(base, filters);
  const labels: Record<string, Record<string, string>> = {};
  for (const [k, opts] of Object.entries(result.facets)) {
    if (Array.isArray(opts)) labels[k] = Object.fromEntries(opts.map((o) => [o.value, o.label]));
  }
  const fallback = result.total === 0 ? await productCards({}, { take: 4 }) : [];

  return (
    <div>
      {bannerUrl ? (
        <section className="grid bg-cream md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:min-h-[380px]">
          <div className="flex items-center px-4 py-12 md:order-1 md:px-8 md:py-16 lg:pl-[max(2rem,calc((100vw-1360px)/2+2rem))] lg:pr-16">
            <div className="max-w-lg">
              <Breadcrumbs items={breadcrumbs} />
              {eyebrow && <p className="eyebrow mt-8">{eyebrow}</p>}
              <h1 className="mt-3 text-4xl leading-tight md:text-[3.4rem]">{title}</h1>
              {description && <p className="mt-4 leading-relaxed text-charcoal/75">{description}</p>}
            </div>
          </div>
          <div className="relative hidden md:order-2 md:block">
            <ProductImage src={bannerUrl} alt="" fill priority sizes="50vw" className="object-cover object-[center_30%]" />
          </div>
        </section>
      ) : (
        <section className="container-x pb-4 pt-8 md:pt-10">
          <Breadcrumbs items={breadcrumbs} />
          {eyebrow && <p className="eyebrow mt-6">{eyebrow}</p>}
          <h1 className="mt-2 text-4xl md:text-5xl">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-muted">{description}</p>}
        </section>
      )}

      <div className="container-x mt-8 grid gap-10 lg:grid-cols-[250px_1fr]">
        <FilterSidebar facets={result.facets} hide={hide} />
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p className="text-sm text-muted" data-testid="result-count" aria-live="polite">
              <span className="font-semibold text-ink">{result.total}</span> {result.total === 1 ? "design" : "designs"}
            </p>
            <div className="flex items-center gap-2">
              <MobileFilters facets={result.facets} hide={hide} total={result.total} />
              <SortSelect />
            </div>
          </div>
          <div className="mb-6"><ActiveFilterChips labels={labels} /></div>
          {result.total === 0 ? (
            <div className="space-y-12">
              <EmptyState
                icon={<SearchX className="size-10" strokeWidth={1.2} />}
                title="No designs match these filters"
                body="Try removing a filter or browsing a related category."
                action={<ButtonLink href={clearHref ?? basePath} variant="outline">Clear filters</ButtonLink>}
              />
              {fallback.length > 0 && (
                <div>
                  <h2 className="mb-6 text-2xl">You might like</h2>
                  <ProductGrid products={fallback} />
                </div>
              )}
            </div>
          ) : (
            <>
              <ProductGrid products={result.items} className="xl:grid-cols-3 2xl:grid-cols-4" />
              <div className="mt-14">
                <Pagination page={result.page} pageCount={result.pageCount} href={(p) => `${basePath}${filtersToQuery(filters, { page: p })}`} />
              </div>
            </>
          )}
          {result.total > 0 && (
            <p className="mt-10 text-center text-xs text-muted">
              Showing {(result.page - 1) * 24 + 1}–{Math.min(result.page * 24, result.total)} of {result.total}. Need help choosing? <Link href="/book-consultation" className="text-gold underline">Talk to a stylist</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
