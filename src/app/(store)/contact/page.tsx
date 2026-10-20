import type { Metadata } from "next";
import { Mail, Phone, Clock } from "lucide-react";
import { getSetting } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { SupportForm } from "@/components/account/SupportForm";

export const metadata: Metadata = { title: "Contact us", description: "Get in touch with our customer care team.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const [store, user] = await Promise.all([getSetting("store"), getCurrentUser()]);
  return (
    <div className="container-x grid gap-12 py-12 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="eyebrow">Customer care</p>
        <h1 className="mt-2 text-5xl">How can we help?</h1>
        <ul className="mt-8 space-y-4 text-sm">
          <li className="flex gap-3"><Phone className="size-5 text-gold" /> <a href={`tel:${store.supportPhone.replace(/\s/g, "")}`}>{store.supportPhone}</a></li>
          <li className="flex gap-3"><Mail className="size-5 text-gold" /> <a href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a></li>
          <li className="flex gap-3"><Clock className="size-5 text-gold" /> {store.supportHours}</li>
        </ul>
      </div>
      <SupportForm type="SUPPORT" defaults={user ? { name: user.name, email: user.email, phone: user.phone ?? "" } : undefined} />
    </div>
  );
}
