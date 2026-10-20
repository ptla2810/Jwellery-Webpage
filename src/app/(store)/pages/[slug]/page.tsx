import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/ui/misc";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const page = await prisma.contentPage.findUnique({ where: { slug } });
  return page?.isPublished ? page : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page) return { title: "Not found" };
  return { title: page.title, description: page.seoDescription ?? undefined, alternates: { canonical: `/pages/${page.slug}` } };
}

/** Renders plain text with "## " headings — no HTML is ever interpreted, so admin content can't inject scripts. */
export default async function ContentPage({ params }: Props) {
  const page = await load((await params).slug);
  if (!page) notFound();
  const blocks = page.body.split(/\n{2,}/);
  return (
    <article className="container-x max-w-3xl py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <h1 className="mt-4 text-5xl">{page.title}</h1>
      <p className="mt-2 text-xs text-muted">Last updated {page.updatedAt.toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
      <div className="prose-policy mt-8">
        {blocks.map((b, i) => {
          const lines = b.split("\n");
          return lines[0].startsWith("## ") ? (
            <div key={i}>
              <h2>{lines[0].slice(3)}</h2>
              {lines.slice(1).length > 0 && <p>{lines.slice(1).join(" ")}</p>}
            </div>
          ) : (
            <p key={i}>{b}</p>
          );
        })}
      </div>
    </article>
  );
}
