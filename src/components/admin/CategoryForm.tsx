"use client";

import { saveCategoryAction, saveCollectionAction } from "@/app/admin/catalog-actions";
import { AdminForm, AField, inputCls } from "./forms";

type Cat = { id?: string; name: string; slug: string; kind: string; parentId: string; description: string; sortOrder: number; isActive: boolean; showInMenu: boolean; seoTitle: string; seoDescription: string; imageUrl: string; bannerUrl: string };

export function CategoryForm({ category, parents }: { category: Cat; parents: { id: string; name: string; kind: string }[] }) {
  return (
    <AdminForm action={saveCategoryAction} submitLabel="Save category">
      {category.id && <input type="hidden" name="id" value={category.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <AField label="Name"><input name="name" defaultValue={category.name} className={inputCls} required /></AField>
        <AField label="Slug" hint="URL: /jewellery/<slug>. Blank = generate"><input name="slug" defaultValue={category.slug} className={inputCls} /></AField>
        <AField label="Type">
          <select name="kind" defaultValue={category.kind} className={inputCls}><option value="TYPE">Jewellery type</option><option value="MATERIAL">Metal / material</option><option value="OCCASION">Occasion</option></select>
        </AField>
        <AField label="Parent (for nested categories)">
          <select name="parentId" defaultValue={category.parentId} className={inputCls}><option value="">None (top level)</option>{parents.filter((p) => p.id !== category.id).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.kind.toLowerCase()})</option>)}</select>
        </AField>
        <AField label="Description" className="md:col-span-2"><textarea name="description" defaultValue={category.description} rows={2} className={inputCls} /></AField>
        <AField label="Sort order"><input name="sortOrder" type="number" min={0} defaultValue={category.sortOrder} className={inputCls} /></AField>
        <div className="flex items-end gap-4 pb-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={category.isActive} /> Active</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="showInMenu" defaultChecked={category.showInMenu} /> Show in menu</label>
        </div>
        <AField label="Tile image" hint={category.imageUrl ? `Current: ${category.imageUrl}` : "JPEG/PNG/WebP, max 5 MB"}><input type="file" name="image" accept="image/*" className="text-sm" /></AField>
        <AField label="Banner image" hint={category.bannerUrl ? `Current: ${category.bannerUrl}` : "Wide image shown above listings"}><input type="file" name="banner" accept="image/*" className="text-sm" /></AField>
        <AField label="SEO title"><input name="seoTitle" defaultValue={category.seoTitle} className={inputCls} /></AField>
        <AField label="Meta description"><input name="seoDescription" defaultValue={category.seoDescription} className={inputCls} /></AField>
      </div>
    </AdminForm>
  );
}

type Col = { id?: string; name: string; slug: string; description: string; rule: string; sortOrder: number; isPublished: boolean; showInMenu: boolean; seoTitle: string; seoDescription: string; imageUrl: string; bannerUrl: string };

export function CollectionForm({ collection }: { collection: Col }) {
  return (
    <AdminForm action={saveCollectionAction} submitLabel="Save collection">
      {collection.id && <input type="hidden" name="id" value={collection.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <AField label="Name"><input name="name" defaultValue={collection.name} className={inputCls} required /></AField>
        <AField label="Slug" hint="URL: /collections/<slug>"><input name="slug" defaultValue={collection.slug} className={inputCls} /></AField>
        <AField label="Products" hint="Automatic rules select products by their flags or publish date">
          <select name="rule" defaultValue={collection.rule} className={inputCls}>
            <option value="MANUAL">Manually selected</option><option value="NEW_ARRIVALS">Automatic: new arrivals (last 120 days)</option><option value="BEST_SELLERS">Automatic: best-seller flag</option><option value="TRENDING">Automatic: trending flag</option>
          </select>
        </AField>
        <AField label="Sort order"><input name="sortOrder" type="number" min={0} defaultValue={collection.sortOrder} className={inputCls} /></AField>
        <AField label="Description" className="md:col-span-2"><textarea name="description" defaultValue={collection.description} rows={2} className={inputCls} /></AField>
        <div className="flex gap-4 text-sm md:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked={collection.isPublished} /> Published</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="showInMenu" defaultChecked={collection.showInMenu} /> Show in menu</label>
        </div>
        <AField label="Tile image" hint={collection.imageUrl || undefined}><input type="file" name="image" accept="image/*" className="text-sm" /></AField>
        <AField label="Banner image" hint={collection.bannerUrl || undefined}><input type="file" name="banner" accept="image/*" className="text-sm" /></AField>
        <AField label="SEO title"><input name="seoTitle" defaultValue={collection.seoTitle} className={inputCls} /></AField>
        <AField label="Meta description"><input name="seoDescription" defaultValue={collection.seoDescription} className={inputCls} /></AField>
      </div>
    </AdminForm>
  );
}
