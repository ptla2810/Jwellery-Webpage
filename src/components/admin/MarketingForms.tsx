"use client";

import { saveBannerAction, saveCouponAction, savePageAction, savePromotionAction } from "@/app/admin/ops-actions";
import { AdminForm, AField, inputCls } from "./forms";

const d = (v?: Date | string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export function CouponForm({ c }: { c?: { id: string; code: string; description: string | null; type: string; value: number; minSubtotal: number; maxDiscount: number | null; usageLimit: number | null; perUserLimit: number | null; startsAt: Date | null; endsAt: Date | null; isActive: boolean } }) {
  return (
    <AdminForm action={saveCouponAction} submitLabel="Save coupon">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <AField label="Code"><input name="code" defaultValue={c?.code} className={`${inputCls} uppercase`} required /></AField>
        <AField label="Description"><input name="description" defaultValue={c?.description ?? ""} className={inputCls} /></AField>
        <AField label="Type"><select name="type" defaultValue={c?.type ?? "PERCENT"} className={inputCls}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount (₹)</option></select></AField>
        <AField label="Value" hint="Percent (e.g. 10) or rupees for fixed"><input name="value" inputMode="decimal" defaultValue={c ? (c.type === "PERCENT" ? c.value : c.value / 100) : ""} className={inputCls} required /></AField>
        <AField label="Minimum bag value (₹)"><input name="minSubtotal" inputMode="decimal" defaultValue={c ? c.minSubtotal / 100 : 0} className={inputCls} /></AField>
        <AField label="Maximum discount (₹, optional)"><input name="maxDiscount" inputMode="decimal" defaultValue={c?.maxDiscount != null ? c.maxDiscount / 100 : ""} className={inputCls} /></AField>
        <AField label="Total usage limit (optional)"><input name="usageLimit" type="number" min={0} defaultValue={c?.usageLimit ?? ""} className={inputCls} /></AField>
        <AField label="Uses per customer (optional)" hint="Requires sign-in to redeem"><input name="perUserLimit" type="number" min={0} defaultValue={c?.perUserLimit ?? ""} className={inputCls} /></AField>
        <AField label="Starts"><input name="startsAt" type="date" defaultValue={d(c?.startsAt)} className={inputCls} /></AField>
        <AField label="Ends"><input name="endsAt" type="date" defaultValue={d(c?.endsAt)} className={inputCls} /></AField>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} /> Active</label>
      </div>
    </AdminForm>
  );
}

type Banner = { id: string; placement: string; eyebrow: string | null; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string; imageAlt: string; sortOrder: number; isActive: boolean; startsAt: Date | null; endsAt: Date | null };
export function BannerForm({ b }: { b?: Banner }) {
  return (
    <AdminForm action={saveBannerAction} submitLabel="Save banner">
      {b && <input type="hidden" name="id" value={b.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <AField label="Placement"><select name="placement" defaultValue={b?.placement ?? "HERO"} className={inputCls}><option value="HERO">Homepage hero slider</option><option value="EDITORIAL">Homepage editorial tiles</option><option value="PROMO_STRIP">Promo strip</option></select></AField>
        <AField label="Eyebrow (small heading)"><input name="eyebrow" defaultValue={b?.eyebrow ?? ""} className={inputCls} /></AField>
        <AField label="Title" className="md:col-span-2"><input name="title" defaultValue={b?.title} className={inputCls} required /></AField>
        <AField label="Subtitle" className="md:col-span-2"><input name="subtitle" defaultValue={b?.subtitle ?? ""} className={inputCls} /></AField>
        <AField label="Button label"><input name="ctaLabel" defaultValue={b?.ctaLabel ?? ""} className={inputCls} /></AField>
        <AField label="Button link" hint="e.g. /collections/bridal"><input name="ctaHref" defaultValue={b?.ctaHref ?? ""} className={inputCls} /></AField>
        <AField label="Image" hint={b ? `Current: ${b.imageUrl}` : "Wide image, at least 1600px"}><input type="file" name="image" accept="image/*" className="text-sm" /></AField>
        <AField label="Image alt text"><input name="imageAlt" defaultValue={b?.imageAlt ?? ""} className={inputCls} /></AField>
        <AField label="Sort order"><input name="sortOrder" type="number" defaultValue={b?.sortOrder ?? 0} className={inputCls} /></AField>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={b?.isActive ?? true} /> Active</label>
        <AField label="Show from"><input name="startsAt" type="date" defaultValue={d(b?.startsAt)} className={inputCls} /></AField>
        <AField label="Show until"><input name="endsAt" type="date" defaultValue={d(b?.endsAt)} className={inputCls} /></AField>
      </div>
    </AdminForm>
  );
}

export function PromotionForm({ p, coupons, banners }: { p?: { id: string; name: string; description: string | null; couponId: string | null; bannerId: string | null; startsAt: Date | null; endsAt: Date | null; isActive: boolean }; coupons: { id: string; code: string }[]; banners: { id: string; title: string }[] }) {
  return (
    <AdminForm action={savePromotionAction} submitLabel={p ? "Save campaign" : "Create campaign"}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 md:grid-cols-3">
        <AField label="Campaign name"><input name="name" defaultValue={p?.name} className={inputCls} /></AField>
        <AField label="Coupon"><select name="couponId" defaultValue={p?.couponId ?? ""} className={inputCls}><option value="">None</option>{coupons.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</select></AField>
        <AField label="Banner"><select name="bannerId" defaultValue={p?.bannerId ?? ""} className={inputCls}><option value="">None</option>{banners.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select></AField>
        <AField label="Description" className="md:col-span-3"><input name="description" defaultValue={p?.description ?? ""} className={inputCls} /></AField>
        <AField label="Starts"><input type="date" name="startsAt" defaultValue={d(p?.startsAt)} className={inputCls} /></AField>
        <AField label="Ends"><input type="date" name="endsAt" defaultValue={d(p?.endsAt)} className={inputCls} /></AField>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={p?.isActive ?? true} /> Active</label>
      </div>
    </AdminForm>
  );
}

export function PageForm({ page }: { page?: { id: string; slug: string; title: string; body: string; isPublished: boolean; seoDescription: string | null } }) {
  return (
    <AdminForm action={savePageAction} submitLabel="Save page">
      {page && <input type="hidden" name="id" value={page.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <AField label="Title"><input name="title" defaultValue={page?.title} className={inputCls} /></AField>
        <AField label="Slug" hint="URL: /pages/<slug>"><input name="slug" defaultValue={page?.slug} className={inputCls} /></AField>
        <AField label="Content" className="md:col-span-2" hint='Plain text. Blank line = new paragraph. Start a line with "## " for a heading.'><textarea name="body" defaultValue={page?.body} rows={18} className={`${inputCls} font-mono text-xs`} /></AField>
        <AField label="Meta description"><input name="seoDescription" defaultValue={page?.seoDescription ?? ""} className={inputCls} /></AField>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" defaultChecked={page?.isPublished ?? true} /> Published</label>
      </div>
    </AdminForm>
  );
}
