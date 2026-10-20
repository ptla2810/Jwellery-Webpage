import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { SupportForm } from "@/components/account/SupportForm";
import { ProductImage } from "@/components/ui/ProductImage";
import { BRAND_PHOTOS, photoUrl } from "@/lib/photos";

export const metadata: Metadata = { title: "Book a consultation", description: "Book a complimentary jewellery consultation in store or by video call.", alternates: { canonical: "/book-consultation" } };

export default async function ConsultationPage() {
  const [c, user] = await Promise.all([getSetting("consultation"), getCurrentUser()]);
  return (
    <div className="container-x grid gap-12 py-12 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Personal styling</p>
        <h1 className="mt-2 text-5xl leading-tight">{c.title}</h1>
        <p className="mt-4 text-charcoal/80">{c.body}</p>
        <div className="relative mt-8 aspect-[4/3] overflow-hidden"><ProductImage src={photoUrl(BRAND_PHOTOS.consultation)} alt="Bride smiling in a gold maang tikka and necklace" fill sizes="50vw" className="object-cover object-[center_30%]" /></div>
        <dl className="mt-6 text-sm">
          <dt className="font-semibold">{c.storeName}</dt>
          <dd className="text-muted">{c.storeAddress}</dd>
          <dd className="text-muted">{c.storeHours}</dd>
        </dl>
      </div>
      <div><SupportForm type="CONSULTATION" defaults={user ? { name: user.name, email: user.email, phone: user.phone ?? "" } : undefined} /></div>
    </div>
  );
}
