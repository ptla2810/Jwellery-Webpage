"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveProductAction } from "@/app/admin/products/actions";
import { AdminForm, AField, inputCls, type AdminState } from "./forms";
import { Card } from "./ui";

export type EditorVariant = {
  id?: string; sku: string; name: string; size: string; price: string; compareAtPrice: string; metalValue: string; makingCharges: string; stoneValue: string; grossWeight: string; stock: number; isActive: boolean; isDefault: boolean;
};
export type EditorProduct = {
  id?: string; name: string; slug: string; sku: string; shortDescription: string; description: string; careInstructions: string; status: string; primaryCategoryId: string;
  metalType: string; purity: string; gender: string; style: string; gemstoneType: string; diamondClarity: string; diamondColor: string; diamondCarat: string; grossWeight: string; netWeight: string;
  certification: string; seoTitle: string; seoDescription: string; isPriceEstimated: boolean; isFeatured: boolean; isBestSeller: boolean; isTrending: boolean; isLightweight: boolean;
  categoryIds: string[]; collectionIds: string[]; variants: EditorVariant[]; attributes: { group: string; name: string; value: string }[];
};

const blankVariant = (sku = ""): EditorVariant => ({ sku, name: "Standard", size: "", price: "", compareAtPrice: "", metalValue: "", makingCharges: "", stoneValue: "", grossWeight: "", stock: 0, isActive: true, isDefault: false });

export function ProductEditor({ product, categories, collections }: { product: EditorProduct; categories: { id: string; name: string; kind: string }[]; collections: { id: string; name: string }[] }) {
  const [variants, setVariants] = useState(product.variants.length ? product.variants : [{ ...blankVariant(product.sku), isDefault: true }]);
  const [attributes, setAttributes] = useState(product.attributes);
  const setV = (i: number, patch: Partial<EditorVariant>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : patch.isDefault ? { ...v, isDefault: false } : v)));
  const types = categories.filter((c) => c.kind === "TYPE");
  const others = categories.filter((c) => c.kind !== "TYPE");

  return (
    <AdminForm action={saveProductAction} submitLabel={product.id ? "Save product" : "Create product"}>
      {(s: AdminState) => {
        const fe = s.fieldErrors ?? {};
        return (
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              {product.id && <input type="hidden" name="id" value={product.id} />}
              <input type="hidden" name="variants" value={JSON.stringify(variants)} />
              <input type="hidden" name="attributes" value={JSON.stringify(attributes.filter((a) => a.name && a.value))} />
              <Card title="Basics">
                <div className="grid gap-4 md:grid-cols-2">
                  <AField label="Name" error={fe.name} className="md:col-span-2"><input name="name" defaultValue={product.name} className={inputCls} required aria-invalid={!!fe.name} /></AField>
                  <AField label="URL slug" error={fe.slug} hint="Leave blank to generate from the name"><input name="slug" defaultValue={product.slug} className={inputCls} /></AField>
                  <AField label="Product SKU" error={fe.sku}><input name="sku" defaultValue={product.sku} className={inputCls} required /></AField>
                  <AField label="Short description" error={fe.shortDescription} className="md:col-span-2"><textarea name="shortDescription" defaultValue={product.shortDescription} rows={2} className={inputCls} /></AField>
                  <AField label="Full description" error={fe.description} className="md:col-span-2" hint="Separate paragraphs with a blank line"><textarea name="description" defaultValue={product.description} rows={6} className={inputCls} /></AField>
                  <AField label="Care instructions" className="md:col-span-2"><textarea name="careInstructions" defaultValue={product.careInstructions} rows={2} className={inputCls} /></AField>
                </div>
              </Card>

              <Card title="Variants, pricing & stock" actions={<button type="button" onClick={() => setVariants((v) => [...v, blankVariant(`${product.sku}-${v.length + 1}`)])} className="flex items-center gap-1 text-xs font-semibold text-gold"><Plus className="size-3.5" /> Add variant</button>}>
                <p className="mb-3 text-xs text-muted">Prices in ₹ including GST. Breakdown fields (metal, making, stone) are optional and pre-tax; when filled, a price breakdown is shown to customers. Removing a variant deactivates it.</p>
                <div className="space-y-3">
                  {variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 rounded border border-line p-3 md:grid-cols-6" data-testid="variant-row">
                      <AField label="SKU" error={fe[`variants.${i}.sku`]}><input value={v.sku} onChange={(e) => setV(i, { sku: e.target.value })} className={inputCls} /></AField>
                      <AField label="Name" error={fe[`variants.${i}.name`]}><input value={v.name} onChange={(e) => setV(i, { name: e.target.value })} className={inputCls} /></AField>
                      <AField label="Size"><input value={v.size} onChange={(e) => setV(i, { size: e.target.value })} className={inputCls} placeholder="e.g. 12" /></AField>
                      <AField label="Price ₹" error={fe[`variants.${i}.price`]}><input value={v.price} onChange={(e) => setV(i, { price: e.target.value })} inputMode="decimal" className={inputCls} data-testid="variant-price" /></AField>
                      <AField label="Compare-at ₹"><input value={v.compareAtPrice} onChange={(e) => setV(i, { compareAtPrice: e.target.value })} inputMode="decimal" className={inputCls} /></AField>
                      <AField label="Stock" error={fe[`variants.${i}.stock`]}><input type="number" min={0} value={v.stock} onChange={(e) => setV(i, { stock: Number(e.target.value) })} className={inputCls} data-testid="variant-stock" /></AField>
                      <AField label="Metal value ₹"><input value={v.metalValue} onChange={(e) => setV(i, { metalValue: e.target.value })} className={inputCls} /></AField>
                      <AField label="Making ₹"><input value={v.makingCharges} onChange={(e) => setV(i, { makingCharges: e.target.value })} className={inputCls} /></AField>
                      <AField label="Stone value ₹"><input value={v.stoneValue} onChange={(e) => setV(i, { stoneValue: e.target.value })} className={inputCls} /></AField>
                      <AField label="Weight (g)"><input value={v.grossWeight} onChange={(e) => setV(i, { grossWeight: e.target.value })} className={inputCls} /></AField>
                      <div className="col-span-2 flex items-end gap-4 pb-2 text-xs">
                        <label className="flex items-center gap-1.5"><input type="checkbox" checked={v.isActive} onChange={(e) => setV(i, { isActive: e.target.checked })} /> Active</label>
                        <label className="flex items-center gap-1.5"><input type="radio" checked={v.isDefault} onChange={() => setV(i, { isDefault: true })} /> Default</label>
                        {variants.length > 1 && <button type="button" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} className="ml-auto text-muted hover:text-danger" aria-label="Remove variant"><Trash2 className="size-4" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
                {fe.variants && <p className="mt-2 text-xs text-danger">{fe.variants}</p>}
              </Card>

              <Card title="Metal & stone">
                <div className="grid gap-4 md:grid-cols-3">
                  <AField label="Metal">
                    <select name="metalType" defaultValue={product.metalType} className={inputCls}>
                      {[["YELLOW_GOLD", "Yellow gold"], ["WHITE_GOLD", "White gold"], ["ROSE_GOLD", "Rose gold"], ["PLATINUM", "Platinum"], ["SILVER", "Silver"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </AField>
                  <AField label="Purity" error={fe.purity} hint="e.g. 22K, 18K, PT950, 925"><input name="purity" defaultValue={product.purity} className={inputCls} /></AField>
                  <AField label="Gender">
                    <select name="gender" defaultValue={product.gender} className={inputCls}>{["WOMEN", "MEN", "KIDS", "UNISEX"].map((g) => <option key={g}>{g}</option>)}</select>
                  </AField>
                  <AField label="Gross weight (g)"><input name="grossWeight" defaultValue={product.grossWeight} className={inputCls} /></AField>
                  <AField label="Net weight (g)"><input name="netWeight" defaultValue={product.netWeight} className={inputCls} /></AField>
                  <AField label="Style"><input name="style" defaultValue={product.style} className={inputCls} placeholder="Traditional / Contemporary…" /></AField>
                  <AField label="Gemstone"><input name="gemstoneType" defaultValue={product.gemstoneType} className={inputCls} /></AField>
                  <AField label="Diamond clarity"><input name="diamondClarity" defaultValue={product.diamondClarity} className={inputCls} /></AField>
                  <AField label="Diamond colour"><input name="diamondColor" defaultValue={product.diamondColor} className={inputCls} /></AField>
                  <AField label="Total carat"><input name="diamondCarat" defaultValue={product.diamondCarat} className={inputCls} /></AField>
                  <AField label="Certification" className="md:col-span-2" hint="Only enter certification you actually hold (lab, certificate no.)"><input name="certification" defaultValue={product.certification} className={inputCls} /></AField>
                </div>
              </Card>

              <Card title="Specifications" actions={<button type="button" onClick={() => setAttributes((a) => [...a, { group: "Details", name: "", value: "" }])} className="flex items-center gap-1 text-xs font-semibold text-gold"><Plus className="size-3.5" /> Add row</button>}>
                <div className="space-y-2">
                  {attributes.map((a, i) => (
                    <div key={i} className="grid grid-cols-[110px_1fr_1.5fr_auto] gap-2">
                      <input aria-label="Group" value={a.group} onChange={(e) => setAttributes((as) => as.map((x, j) => (j === i ? { ...x, group: e.target.value } : x)))} className={inputCls} />
                      <input aria-label="Name" value={a.name} onChange={(e) => setAttributes((as) => as.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputCls} placeholder="Name" />
                      <input aria-label="Value" value={a.value} onChange={(e) => setAttributes((as) => as.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={inputCls} placeholder="Value" />
                      <button type="button" onClick={() => setAttributes((as) => as.filter((_, j) => j !== i))} aria-label="Remove row" className="text-muted hover:text-danger"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  {!attributes.length && <p className="text-sm text-muted">No specification rows.</p>}
                </div>
              </Card>

              <Card title="SEO">
                <div className="grid gap-4">
                  <AField label="SEO title"><input name="seoTitle" defaultValue={product.seoTitle} maxLength={120} className={inputCls} /></AField>
                  <AField label="Meta description"><textarea name="seoDescription" defaultValue={product.seoDescription} maxLength={300} rows={2} className={inputCls} /></AField>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card title="Status">
                <select name="status" defaultValue={product.status} className={inputCls} aria-label="Status">
                  <option value="DRAFT">Draft (hidden)</option>
                  <option value="ACTIVE">Active (published)</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <div className="mt-4 space-y-2 text-sm">
                  {([["isFeatured", "Featured"], ["isBestSeller", "Best seller"], ["isTrending", "Trending"], ["isLightweight", "Lightweight"], ["isPriceEstimated", "Price is an estimate (weight-based)"]] as const).map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2"><input type="checkbox" name={k} defaultChecked={product[k]} /> {l}</label>
                  ))}
                </div>
              </Card>
              <Card title="Organisation">
                <AField label="Primary category (jewellery type)" error={fe.primaryCategoryId}>
                  <select name="primaryCategoryId" defaultValue={product.primaryCategoryId} className={inputCls}>
                    <option value="">Select…</option>
                    {types.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </AField>
                <p className="mb-1 mt-4 text-xs font-semibold">Metal / material &amp; occasions</p>
                <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
                  {others.map((c) => (
                    <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="categoryIds" value={c.id} defaultChecked={product.categoryIds.includes(c.id)} /> {c.name} <span className="text-xs text-muted">{c.kind.toLowerCase()}</span></label>
                  ))}
                </div>
                <p className="mb-1 mt-4 text-xs font-semibold">Collections</p>
                <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
                  {collections.map((c) => (
                    <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="collectionIds" value={c.id} defaultChecked={product.collectionIds.includes(c.id)} /> {c.name}</label>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        );
      }}
    </AdminForm>
  );
}
