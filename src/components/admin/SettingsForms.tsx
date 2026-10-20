"use client";

import { saveSettingsAction } from "@/app/admin/ops-actions";
import type { AnnouncementSettings, ConsultationSettings, ShippingSettings, StoreSettings, TaxSettings } from "@/lib/settings-defaults";
import { AdminForm, AField, inputCls } from "./forms";

const r = (p: number) => p / 100;

export function StoreForm({ s }: { s: StoreSettings }) {
  return (
    <AdminForm action={saveSettingsAction}>
      <input type="hidden" name="key" value="store" />
      <div className="grid gap-4 md:grid-cols-2">
        <AField label="Store name" hint="Shown in header, emails and titles"><input name="name" defaultValue={s.name} className={inputCls} /></AField>
        <AField label="Tagline"><input name="tagline" defaultValue={s.tagline} className={inputCls} /></AField>
        <AField label="Support email"><input name="supportEmail" type="email" defaultValue={s.supportEmail} className={inputCls} /></AField>
        <AField label="Support phone"><input name="supportPhone" defaultValue={s.supportPhone} className={inputCls} /></AField>
        <AField label="WhatsApp"><input name="whatsapp" defaultValue={s.whatsapp} className={inputCls} /></AField>
        <AField label="Support hours"><input name="supportHours" defaultValue={s.supportHours} className={inputCls} /></AField>
        <AField label="Registered address" className="md:col-span-2"><input name="address" defaultValue={s.address} className={inputCls} /></AField>
        {(["instagram", "facebook", "youtube", "pinterest"] as const).map((k) => (
          <AField key={k} label={`${k[0].toUpperCase()}${k.slice(1)} URL`}><input name={k} defaultValue={s.social[k]} className={inputCls} placeholder="https://" /></AField>
        ))}
      </div>
    </AdminForm>
  );
}

export function AnnouncementForm({ s }: { s: AnnouncementSettings }) {
  return (
    <AdminForm action={saveSettingsAction}>
      <input type="hidden" name="key" value="announcement" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={s.isActive} /> Show announcement bar</label>
      <AField label="Messages (one per line, rotates)"><textarea name="messages" rows={4} defaultValue={s.messages.join("\n")} className={inputCls} /></AField>
    </AdminForm>
  );
}

export function ShippingForm({ s }: { s: ShippingSettings }) {
  return (
    <AdminForm action={saveSettingsAction}>
      <input type="hidden" name="key" value="shipping" />
      <div className="grid gap-4 md:grid-cols-3">
        <AField label="Free shipping above (₹)"><input name="freeShippingThreshold" defaultValue={r(s.freeShippingThreshold)} className={inputCls} /></AField>
        <AField label="Standard shipping fee (₹)"><input name="standardFee" defaultValue={r(s.standardFee)} className={inputCls} /></AField>
        <AField label="Express surcharge (₹)"><input name="expressFee" defaultValue={r(s.expressFee)} className={inputCls} /></AField>
        <AField label="Standard days (min)"><input name="standardMin" type="number" defaultValue={s.standardDays[0]} className={inputCls} /></AField>
        <AField label="Standard days (max)"><input name="standardMax" type="number" defaultValue={s.standardDays[1]} className={inputCls} /></AField>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="expressEnabled" defaultChecked={s.expressEnabled} /> Offer express delivery</label>
        <AField label="Express days (min)"><input name="expressMin" type="number" defaultValue={s.expressDays[0]} className={inputCls} /></AField>
        <AField label="Express days (max)"><input name="expressMax" type="number" defaultValue={s.expressDays[1]} className={inputCls} /></AField>
        <AField label="Metro speed-up (days)"><input name="metroDaysReduction" type="number" defaultValue={s.metroDaysReduction} className={inputCls} /></AField>
        <AField label="Metro PIN prefixes" className="md:col-span-3" hint="Comma-separated, e.g. 11, 40, 56"><input name="metroPrefixes" defaultValue={s.metroPrefixes.join(", ")} className={inputCls} /></AField>
        <AField label="Non-serviceable PIN prefixes" className="md:col-span-3"><input name="unserviceablePrefixes" defaultValue={s.unserviceablePrefixes.join(", ")} className={inputCls} /></AField>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="codEnabled" defaultChecked={s.codEnabled} /> Enable cash on delivery</label>
        <AField label="COD fee (₹)"><input name="codFee" defaultValue={r(s.codFee)} className={inputCls} /></AField>
        <AField label="COD maximum order value (₹)"><input name="codMaxOrderValue" defaultValue={r(s.codMaxOrderValue)} className={inputCls} /></AField>
      </div>
    </AdminForm>
  );
}

export function TaxForm({ s }: { s: TaxSettings }) {
  return (
    <AdminForm action={saveSettingsAction}>
      <input type="hidden" name="key" value="tax" />
      <div className="grid gap-4 md:grid-cols-2">
        <AField label="GST rate (%)" hint="Jewellery is typically 3% — confirm with your tax advisor"><input name="gstRate" inputMode="decimal" defaultValue={s.gstRateBps / 100} className={inputCls} /></AField>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="pricesIncludeTax" defaultChecked={s.pricesIncludeTax} /> Catalogue prices include GST</label>
        <AField label="Tax note" className="md:col-span-2"><input name="note" defaultValue={s.note} className={inputCls} /></AField>
      </div>
    </AdminForm>
  );
}

export function ConsultationForm({ s }: { s: ConsultationSettings }) {
  return (
    <AdminForm action={saveSettingsAction}>
      <input type="hidden" name="key" value="consultation" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={s.isActive} /> Show consultation section on homepage</label>
      <div className="grid gap-4 md:grid-cols-2">
        <AField label="Title"><input name="title" defaultValue={s.title} className={inputCls} /></AField>
        <AField label="Store / studio name"><input name="storeName" defaultValue={s.storeName} className={inputCls} /></AField>
        <AField label="Text" className="md:col-span-2"><textarea name="body" rows={3} defaultValue={s.body} className={inputCls} /></AField>
        <AField label="Address"><input name="storeAddress" defaultValue={s.storeAddress} className={inputCls} /></AField>
        <AField label="Hours"><input name="storeHours" defaultValue={s.storeHours} className={inputCls} /></AField>
        <AField label="Map / directions URL" className="md:col-span-2"><input name="mapUrl" defaultValue={s.mapUrl} className={inputCls} placeholder="https://maps.google.com/…" /></AField>
      </div>
    </AdminForm>
  );
}
