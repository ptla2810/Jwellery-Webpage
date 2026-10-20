"use client";

import Image from "next/image";
import { useState } from "react";
import { deleteImageAction, updateImageAction, uploadProductImageAction } from "@/app/admin/products/actions";
import { ActionButton, AdminForm, AField, inputCls } from "./forms";

export function ImageManager({ productId, images }: { productId: string; images: { id: string; url: string; alt: string }[] }) {
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id} className="space-y-2 rounded border border-line p-2">
            <div className="relative aspect-[4/5] bg-cream">
              <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-cover" unoptimized={img.url.endsWith(".svg")} />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink px-1.5 py-0.5 text-[0.6rem] uppercase text-ivory">Main</span>}
            </div>
            <AltEditor id={img.id} alt={img.alt} />
            <div className="flex gap-1">
              <MoveButtons id={img.id} first={i === 0} last={i === images.length - 1} />
              <ActionButton action={() => deleteImageAction(img.id)} label="Delete" variant="ghost" confirmText="Delete this image?" className="ml-auto text-danger" />
            </div>
          </li>
        ))}
      </ul>
      <AdminForm action={uploadProductImageAction} submitLabel="Upload image">
        <input type="hidden" name="productId" value={productId} />
        <div className="grid gap-3 md:grid-cols-2">
          <AField label="Image file" hint="JPEG, PNG, WebP or AVIF · max 5 MB · 4:5 portrait works best"><input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="text-sm" /></AField>
          <AField label="Alt text"><input name="alt" className={inputCls} placeholder="Describe the image for screen readers" /></AField>
        </div>
      </AdminForm>
    </div>
  );
}

function MoveButtons({ id, first, last }: { id: string; first: boolean; last: boolean }) {
  return (
    <>
      {!first && <ActionButton action={() => updateImageAction(id, { move: -1 })} label="↑" variant="ghost" />}
      {!last && <ActionButton action={() => updateImageAction(id, { move: 1 })} label="↓" variant="ghost" />}
    </>
  );
}

function AltEditor({ id, alt }: { id: string; alt: string }) {
  const [v, setV] = useState(alt);
  return (
    <div className="flex gap-1">
      <input aria-label="Alt text" value={v} onChange={(e) => setV(e.target.value)} className={`${inputCls} py-1 text-xs`} />
      {v !== alt && <ActionButton action={() => updateImageAction(id, { alt: v })} label="Save" variant="ghost" />}
    </div>
  );
}

