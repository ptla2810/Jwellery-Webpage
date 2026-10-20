/**
 * Idempotent seed: safe to run repeatedly. Existing records (matched by slug / SKU / code / key) are left untouched,
 * so changes made in the admin are never overwritten. Does NOT create any administrator account —
 * use `npm run admin:create` for that.
 */
import { PrismaClient, type MetalType } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { productSvg, sceneSvg, type ArtMetal } from "../scripts/art";
import { PERMISSIONS, ROLE_PRESETS } from "../src/lib/auth/permissions";
import { settingDefaults } from "../src/lib/settings-defaults";
import { syncProductDerived, syncProductRating } from "../src/lib/catalog/sync";
import { COLLECTIONS, MATERIAL_CATEGORIES, OCCASION_CATEGORIES, POLICY_PAGES, PRODUCTS, TYPE_CATEGORIES, type SeedProduct } from "./seed-data";

const prisma = new PrismaClient();
const PUBLIC = path.join(process.cwd(), "public");

function writeAsset(rel: string, svg: string) {
  const file = path.join(PUBLIC, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, svg);
  return "/" + rel.replace(/\\/g, "/");
}

const artMetal = (m: MetalType): ArtMetal =>
  m === "YELLOW_GOLD" ? "yellow" : m === "ROSE_GOLD" ? "rose" : m === "SILVER" ? "silver" : "white";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const rupees = (n: number) => Math.round(n) * 100;
const round100 = (paise: number) => Math.round(paise / 10000) * 10000; // round to ₹100

const TYPE_CODES: Record<string, string> = {
  rings: "RG", earrings: "ER", necklaces: "NK", pendants: "PD", chains: "CH", bangles: "BG", bracelets: "BR",
  mangalsutras: "MS", "nose-pins": "NP", anklets: "AK", "jewellery-sets": "ST", "mens-jewellery": "MN", "kids-jewellery": "KD",
};

const SIZES = {
  ring: [["10", 0], ["12", 0.02], ["14", 0.04], ["16", 0.06]],
  chain: [["16 in", 0], ["18 in", 0.06], ["20 in", 0.12]],
  bangle: [["2.4", 0], ["2.6", 0.04], ["2.8", 0.08]],
} as const;

const CARE: Record<string, string> = {
  gold: "Store separately in the pouch provided. Avoid contact with perfume, chlorine and harsh chemicals. Clean with a soft, dry cloth.",
  silver: "Silver naturally tarnishes over time. Store in an airtight pouch and polish gently with a silver cloth.",
  platinum: "Platinum develops a soft patina with wear. Clean with mild soap and warm water and pat dry.",
};

async function seedRoles() {
  for (const [key, label] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({ where: { key }, create: { key, label }, update: { label } });
  }
  const perms = await prisma.permission.findMany();
  for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
    const role = await prisma.role.upsert({ where: { key }, create: { key, name: preset.name, isSystem: true }, update: {} });
    if (key === "admin" || key === "customer") {
      // system roles always reflect the latest permission set
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    }
    const existing = await prisma.rolePermission.count({ where: { roleId: role.id } });
    if (existing === 0 && preset.permissions.length) {
      await prisma.rolePermission.createMany({
        data: preset.permissions.map((p) => ({ roleId: role.id, permissionId: perms.find((x) => x.key === p)!.id })),
      });
    }
  }
}

async function seedTaxonomy() {
  let i = 0;
  for (const c of TYPE_CATEGORIES) {
    const imageUrl = writeAsset(`images/categories/${c.slug}.svg`, productSvg({ shape: c.shape, metal: c.metal, stone: c.stone, view: 0, seed: c.slug }));
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, kind: "TYPE", description: c.description, sortOrder: i++, imageUrl, seoTitle: `${c.name} — Shop Fine ${c.name} Online`, seoDescription: c.description },
      update: {},
    });
  }
  const materialArt: Record<string, Parameters<typeof productSvg>[0]> = {
    gold: { shape: "bangle", metal: "yellow", stone: "none", view: 0, seed: "m-gold" },
    diamond: { shape: "ring-solitaire", metal: "white", stone: "diamond", view: 0, seed: "m-dia" },
    platinum: { shape: "ring-band", metal: "white", stone: "none", view: 0, seed: "m-pt" },
    silver: { shape: "anklet", metal: "silver", stone: "none", view: 0, seed: "m-ag" },
    gemstone: { shape: "ring-cluster", metal: "yellow", stone: "emerald", view: 1, seed: "m-gem" },
    polki: { shape: "earring-drop", metal: "yellow", stone: "polki", view: 2, seed: "m-polki" },
    kundan: { shape: "necklace-choker", metal: "yellow", stone: "kundan", view: 2, seed: "m-kundan" },
    pearl: { shape: "earring-drop", metal: "yellow", stone: "pearl", view: 1, seed: "m-pearl" },
  };
  i = 0;
  for (const c of MATERIAL_CATEGORIES) {
    const imageUrl = writeAsset(`images/categories/${c.slug}.svg`, productSvg(materialArt[c.slug]));
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, kind: "MATERIAL", description: c.description, sortOrder: i++, imageUrl, seoTitle: `${c.name} Jewellery Online`, seoDescription: c.description },
      update: {},
    });
  }
  const occasionArt = [
    ["set", "yellow", "polki", "velvet"], ["ring-solitaire", "white", "diamond", "midnight"], ["earring-stud", "rose", "diamond", "ivory"],
    ["pendant", "yellow", "diamond", "champagne"], ["earring-jhumka", "yellow", "ruby", "velvet"], ["earring-hoop", "white", "sapphire", "midnight"],
    ["bracelet", "white", "diamond", "blush"], ["pendant", "rose", "diamond", "blush"],
  ] as const;
  i = 0;
  for (const [idx, c] of OCCASION_CATEGORIES.entries()) {
    const [shape, metal, stone, palette] = occasionArt[idx];
    const imageUrl = writeAsset(
      `images/categories/${c.slug}.svg`,
      sceneSvg({ width: 800, height: 1000, palette, seed: c.slug, items: [{ shape, metal, stone, x: 400, y: 500, scale: 0.85 }] }),
    );
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, kind: "OCCASION", sortOrder: i++, imageUrl, description: `Jewellery chosen for ${c.name.toLowerCase()}.`, seoTitle: `${c.name} Jewellery`, seoDescription: `Shop jewellery for ${c.name.toLowerCase()}.` },
      update: {},
    });
  }
  const colArt: Record<string, { shape: Parameters<typeof productSvg>[0]["shape"]; metal: ArtMetal; stone: Parameters<typeof productSvg>[0]["stone"] }> = {
    "new-arrivals": { shape: "earring-hoop", metal: "yellow", stone: "none" },
    "best-sellers": { shape: "ring-solitaire", metal: "yellow", stone: "diamond" },
    "trending-now": { shape: "pendant", metal: "rose", stone: "diamond" },
    lightweight: { shape: "nosepin", metal: "yellow", stone: "diamond" },
    traditional: { shape: "earring-jhumka", metal: "yellow", stone: "ruby" },
    contemporary: { shape: "bracelet", metal: "white", stone: "sapphire" },
    bridal: { shape: "necklace-choker", metal: "yellow", stone: "kundan" },
    premium: { shape: "necklace", metal: "white", stone: "emerald" },
    "gifts-for-her": { shape: "pendant", metal: "rose", stone: "ruby" },
    "gifts-for-him": { shape: "kada", metal: "yellow", stone: "none" },
  };
  i = 0;
  for (const c of COLLECTIONS) {
    const a = colArt[c.slug];
    const imageUrl = writeAsset(
      `images/collections/${c.slug}.svg`,
      sceneSvg({ width: 800, height: 1000, palette: c.palette, seed: c.slug, items: [{ ...a, x: 400, y: 520, scale: 0.85 }] }),
    );
    const bannerUrl = writeAsset(
      `images/collections/${c.slug}-banner.svg`,
      sceneSvg({ width: 1600, height: 500, palette: c.palette, seed: c.slug + "b", items: [{ ...a, x: 1150, y: 260, scale: 0.42 }] }),
    );
    await prisma.collection.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, description: c.description, rule: c.rule, sortOrder: i++, imageUrl, bannerUrl, seoTitle: c.name, seoDescription: c.description },
      update: {},
    });
  }
}

function priceParts(p: SeedProduct, total: number) {
  const pre = Math.round(total / 1.03);
  const stoneShare = p.stone === "none" ? 0 : p.stone === "diamond" ? 0.45 : p.stone === "polki" || p.stone === "kundan" ? 0.35 : 0.25;
  const stoneValue = Math.round(pre * stoneShare);
  const makingCharges = Math.round((pre - stoneValue) * 0.14);
  return { metalValue: pre - stoneValue - makingCharges, makingCharges, stoneValue: stoneValue || null };
}

async function seedProducts() {
  const cats = await prisma.category.findMany();
  const cols = await prisma.collection.findMany();
  const counters: Record<string, number> = {};
  let created = 0;
  for (const p of PRODUCTS) {
    const code = TYPE_CODES[p.type];
    counters[code] = (counters[code] ?? 0) + 1;
    const sku = `AUR-${code}-${String(counters[code]).padStart(3, "0")}`;
    const slug = slugify(p.name);
    if (await prisma.product.findUnique({ where: { slug } })) continue;

    const primary = cats.find((c) => c.slug === p.type)!;
    const metal = artMetal(p.metal);
    const images = [0, 1, 2].map((view) => ({
      url: writeAsset(`images/catalog/${sku.toLowerCase()}-${view + 1}.svg`, productSvg({ shape: p.shape, metal, stone: p.stone, view: view as 0 | 1 | 2, seed: sku })),
      alt: `${p.name} — illustrative image ${view + 1}`,
      sortOrder: view,
    }));
    const basePaise = rupees(p.price);
    const sizes = p.sizes ? SIZES[p.sizes] : null;
    const variants = (sizes ?? [["", 0] as const]).map(([size, bump], idx) => {
      const price = idx === 0 ? basePaise : round100(basePaise * (1 + bump));
      const compareAt = p.compareAt ? (idx === 0 ? rupees(p.compareAt) : round100(rupees(p.compareAt) * (1 + bump))) : null;
      const stock = sizes ? Math.max(0, Math.round(p.stock / sizes.length) + (idx === 1 && p.stock > 0 ? 1 : 0)) : p.stock;
      return {
        sku: sizes ? `${sku}-${size.replace(/[^0-9a-z.]/gi, "").replace(".", "")}` : sku,
        name: sizes ? (p.sizes === "ring" ? `Ring size ${size}` : p.sizes === "chain" ? `Length ${size}` : `Size ${size}`) : "Standard",
        size: size || null,
        price,
        compareAtPrice: compareAt,
        ...priceParts(p, price),
        grossWeight: +(p.weight * (1 + bump)).toFixed(3),
        isDefault: idx === (sizes ? Math.min(1, sizes.length - 1) : 0),
        sortOrder: idx,
        stock,
      };
    });
    const stoneWeight = p.carat ? p.carat * 0.2 : p.stone !== "none" ? p.weight * 0.08 : 0;
    const netWeight = +(p.weight - stoneWeight).toFixed(3);
    const careKey = p.metal === "SILVER" ? "silver" : p.metal === "PLATINUM" ? "platinum" : "gold";
    const attributes = [
      ["Metal", "Metal", p.metal.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())],
      ["Metal", "Purity", p.purity],
      ["Metal", "Gross weight (approx.)", `${p.weight.toFixed(2)} g`],
      ["Metal", "Net metal weight (approx.)", `${netWeight.toFixed(2)} g`],
      ...(p.gemstone ? [["Stone", "Stone", p.gemstone]] : []),
      ...(p.carat ? [["Stone", "Total carat weight", `${p.carat.toFixed(2)} ct`]] : []),
      ...(p.clarity ? [["Stone", "Clarity", p.clarity]] : []),
      ...(p.color ? [["Stone", "Colour", p.color]] : []),
      ["Details", "Style", p.style],
      ["Details", "Ideal for", (p.gender ?? "WOMEN").charAt(0) + (p.gender ?? "WOMEN").slice(1).toLowerCase()],
      ["Details", "Data source", "Demo catalogue — illustrative specifications"],
    ] as [string, string, string][];
    const publishedAt = new Date(Date.now() - p.daysAgo * 86_400_000);

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug,
          sku,
          name: p.name,
          shortDescription: p.blurb,
          description: `${p.blurb}\n\nCrafted in ${p.purity} ${p.metal === "PLATINUM" ? "platinum" : p.metal === "SILVER" ? "sterling silver" : p.metal.replace("_", " ").toLowerCase()}${p.gemstone ? ` with ${p.gemstone.toLowerCase()}${p.gemstone === "Diamond" ? "s" : ""}` : ""}, this ${p.style.toLowerCase()} piece is part of our demo catalogue. Specifications and imagery are illustrative and should be replaced with real product data before launch.`,
          careInstructions: CARE[careKey],
          status: "ACTIVE",
          primaryCategoryId: primary.id,
          metalType: p.metal,
          purity: p.purity,
          gender: p.gender ?? "WOMEN",
          style: p.style,
          gemstoneType: p.gemstone ?? null,
          diamondClarity: p.clarity ?? null,
          diamondColor: p.color ?? null,
          diamondCarat: p.carat ?? null,
          grossWeight: p.weight,
          netWeight,
          certification: null,
          isPriceEstimated: !!p.estimated,
          isFeatured: !!p.featured,
          isBestSeller: !!p.bestSeller,
          isTrending: !!p.trending,
          isLightweight: !!p.lightweight,
          salesCount: p.bestSeller ? 40 + (p.stock % 17) : p.trending ? 18 : p.daysAgo % 11,
          isDemo: true,
          publishedAt,
          createdAt: publishedAt,
          seoTitle: `${p.name} | ${p.purity} ${p.gemstone ?? ""} ${primary.name}`.replace(/\s+/g, " "),
          seoDescription: p.blurb,
          images: { create: images },
          attributes: { create: attributes.map(([group, name, value], sortOrder) => ({ group, name, value, sortOrder })) },
          categories: {
            create: [...p.materials, ...p.occasions]
              .map((s) => cats.find((c) => c.slug === s))
              .filter(Boolean)
              .map((c) => ({ categoryId: c!.id })),
          },
          collections: {
            create: p.collections.map((s, idx) => ({ collectionId: cols.find((c) => c.slug === s)!.id, sortOrder: idx })),
          },
        },
      });
      for (const { stock, ...v } of variants) {
        const variant = await tx.productVariant.create({ data: { ...v, productId: product.id } });
        await tx.inventory.create({ data: { variantId: variant.id, quantity: stock, lowStockThreshold: 2 } });
        if (stock > 0) await tx.inventoryMovement.create({ data: { variantId: variant.id, delta: stock, reason: "INITIAL", note: "Seed stock" } });
      }
      await syncProductDerived(tx, product.id);
    });

    if (p.bestSeller) {
      const product = await prisma.product.findUniqueOrThrow({ where: { slug } });
      const samples = [
        { rating: 5, title: "Beautiful finish", body: "Sample review shown for demonstration. Replace with genuine customer reviews." },
        { rating: 4, title: "Lovely everyday piece", body: "Sample review shown for demonstration purposes only." },
      ];
      for (const s of samples) {
        await prisma.review.create({ data: { productId: product.id, authorName: "Demo reviewer", status: "APPROVED", isDemo: true, ...s } });
      }
      await syncProductRating(prisma, product.id);
    }
    created++;
  }
  return created;
}

async function seedBanners() {
  if ((await prisma.banner.count()) > 0) return;
  const hero = [
    {
      eyebrow: "The Wedding Edit",
      title: "Heirlooms, crafted for your forever",
      subtitle: "Polki, kundan and gold pieces designed to be treasured for generations.",
      ctaLabel: "Explore bridal",
      ctaHref: "/collections/bridal",
      art: sceneSvg({ width: 1600, height: 800, palette: "velvet", seed: "hero1", items: [
        { shape: "necklace-choker", metal: "yellow", stone: "kundan", x: 1060, y: 400, scale: 0.78 },
        { shape: "earring-jhumka", metal: "yellow", stone: "ruby", x: 1420, y: 470, scale: 0.36 },
      ] }),
    },
    {
      eyebrow: "Everyday Diamonds",
      title: "Light enough for every day",
      subtitle: "Feather-light diamonds and gold for the office, the weekend and everything between.",
      ctaLabel: "Shop lightweight",
      ctaHref: "/collections/lightweight",
      art: sceneSvg({ width: 1600, height: 800, palette: "ivory", seed: "hero2", items: [
        { shape: "pendant", metal: "rose", stone: "diamond", x: 1050, y: 400, scale: 0.7 },
        { shape: "earring-stud", metal: "rose", stone: "diamond", x: 1380, y: 560, scale: 0.36 },
      ] }),
    },
    {
      eyebrow: "Solitaires",
      title: "Say yes to brilliance",
      subtitle: "Engagement rings in gold and platinum, with diamonds chosen for their sparkle.",
      ctaLabel: "Shop engagement rings",
      ctaHref: "/jewellery/engagement",
      art: sceneSvg({ width: 1600, height: 800, palette: "midnight", seed: "hero3", items: [
        { shape: "ring-solitaire", metal: "white", stone: "diamond", x: 1100, y: 420, scale: 0.62 },
        { shape: "ring-band", metal: "white", stone: "diamond", x: 1400, y: 520, scale: 0.34, rotate: 12 },
      ] }),
    },
  ];
  for (const [i, h] of hero.entries()) {
    const { art, ...data } = h;
    await prisma.banner.create({ data: { ...data, placement: "HERO", sortOrder: i, imageUrl: writeAsset(`images/banners/hero-${i + 1}.svg`, art), imageAlt: `${h.title} (illustration)` } });
  }
  const editorial = [
    { title: "The Diamond Room", subtitle: "Solitaires, tennis bracelets and statement necklaces.", ctaLabel: "Discover diamonds", ctaHref: "/jewellery/diamond", palette: "midnight", shape: "bracelet", metal: "white", stone: "diamond" },
    { title: "Pure Gold, Pure Heritage", subtitle: "22K gold crafted with traditional techniques.", ctaLabel: "Shop gold", ctaHref: "/jewellery/gold", palette: "champagne", shape: "bangle", metal: "yellow", stone: "none" },
    { title: "Gifts that mean more", subtitle: "Thoughtful pieces under ₹25,000.", ctaLabel: "Find a gift", ctaHref: "/collections/gifts-for-her", palette: "blush", shape: "pendant", metal: "rose", stone: "ruby" },
  ] as const;
  for (const [i, e] of editorial.entries()) {
    await prisma.banner.create({
      data: {
        placement: "EDITORIAL",
        title: e.title,
        subtitle: e.subtitle,
        ctaLabel: e.ctaLabel,
        ctaHref: e.ctaHref,
        sortOrder: i,
        imageAlt: `${e.title} (illustration)`,
        imageUrl: writeAsset(`images/banners/editorial-${i + 1}.svg`, sceneSvg({ width: 900, height: 1100, palette: e.palette, seed: `ed${i}`, items: [{ shape: e.shape, metal: e.metal, stone: e.stone, x: 450, y: 560, scale: 0.9 }] })),
      },
    });
  }
  writeAsset("images/brand/craft.svg", sceneSvg({ width: 1200, height: 1200, palette: "emerald", seed: "craft", items: [
    { shape: "necklace", metal: "yellow", stone: "emerald", x: 600, y: 560, scale: 1.1 },
  ] }));
  writeAsset("images/brand/consultation.svg", sceneSvg({ width: 1200, height: 900, palette: "champagne", seed: "consult", items: [
    { shape: "ring-solitaire", metal: "yellow", stone: "diamond", x: 520, y: 470, scale: 0.6 },
    { shape: "earring-drop", metal: "yellow", stone: "pearl", x: 820, y: 500, scale: 0.45 },
  ] }));
}

async function seedSettingsAndContent() {
  for (const [key, value] of Object.entries(settingDefaults)) {
    await prisma.storeSetting.upsert({ where: { key }, create: { key, value: value as object }, update: {} });
  }
  for (const page of POLICY_PAGES) {
    await prisma.contentPage.upsert({ where: { slug: page.slug }, create: page, update: {} });
  }
  const welcome = await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    create: { code: "WELCOME10", description: "10% off your first order (max ₹5,000)", type: "PERCENT", value: 10, minSubtotal: rupees(10000), maxDiscount: rupees(5000), perUserLimit: 1 },
    update: {},
  });
  const festive = await prisma.coupon.upsert({
    where: { code: "FESTIVE2000" },
    create: { code: "FESTIVE2000", description: "₹2,000 off orders above ₹40,000", type: "FIXED", value: rupees(2000), minSubtotal: rupees(40000) },
    update: {},
  });
  if ((await prisma.promotion.count()) === 0) {
    const hero = await prisma.banner.findFirst({ where: { placement: "HERO" }, orderBy: { sortOrder: "asc" } });
    await prisma.promotion.create({ data: { name: "Festive Edit", description: "₹2,000 off festive purchases above ₹40,000", couponId: festive.id, bannerId: hero?.id } });
    await prisma.promotion.create({ data: { name: "Welcome offer", description: "10% off first orders", couponId: welcome.id } });
  }
}

async function main() {
  await seedRoles();
  await seedTaxonomy();
  const created = await seedProducts();
  await seedBanners();
  await seedSettingsAndContent();
  const total = await prisma.product.count();
  console.log(`Seed complete: ${created} new products (${total} total).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
