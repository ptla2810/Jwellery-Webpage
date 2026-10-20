import Link from "next/link";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { getSetting } from "@/lib/settings";
import { NewsletterForm } from "./NewsletterForm";

const SOCIAL_LABELS = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", pinterest: "Pinterest" } as const;

export async function Footer() {
  const store = await getSetting("store");
  const socials = Object.entries(store.social).filter(([, url]) => url) as [keyof typeof SOCIAL_LABELS, string][];
  const col = "space-y-2.5 text-sm text-ivory/70";
  const link = "hover:text-gold-300 transition-colors";
  return (
    <footer className="mt-24 bg-ink text-ivory">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl">{store.name}</p>
          <p className="mt-2 max-w-xs text-sm text-ivory/60">{store.tagline}</p>
          <p className="mt-8 eyebrow text-gold-300">Join our list</p>
          <p className="mt-2 text-sm text-ivory/60">New collections, styling notes and private previews.</p>
          <div className="mt-3"><NewsletterForm /></div>
        </div>
        <div>
          <p className="eyebrow mb-4 text-gold-300">Shop</p>
          <ul className={col}>
            <li><Link className={link} href="/jewellery/rings">Rings</Link></li>
            <li><Link className={link} href="/jewellery/earrings">Earrings</Link></li>
            <li><Link className={link} href="/jewellery/necklaces">Necklaces</Link></li>
            <li><Link className={link} href="/collections/bridal">Bridal</Link></li>
            <li><Link className={link} href="/collections/new-arrivals">New arrivals</Link></li>
            <li><Link className={link} href="/collections">All collections</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4 text-gold-300">Customer care</p>
          <ul className={col}>
            <li><Link className={link} href="/track-order">Track your order</Link></li>
            <li><Link className={link} href="/contact">Contact us</Link></li>
            <li><Link className={link} href="/book-consultation">Book a consultation</Link></li>
            <li><Link className={link} href="/pages/shipping-policy">Shipping policy</Link></li>
            <li><Link className={link} href="/pages/returns-and-exchange">Returns &amp; exchange</Link></li>
            <li><Link className={link} href="/pages/warranty">Warranty</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4 text-gold-300">Get in touch</p>
          <ul className={col}>
            <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" /><a className={link} href={`tel:${store.supportPhone.replace(/\s/g, "")}`}>{store.supportPhone}</a></li>
            <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0" /><a className={link} href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a></li>
            <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0" />{store.supportHours}</li>
            <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{store.address}</li>
          </ul>
          {socials.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em]">
              {socials.map(([k, url]) => (
                <li key={k}><a href={url} target="_blank" rel="noopener noreferrer" className="text-ivory/70 hover:text-gold-300">{SOCIAL_LABELS[k]}</a></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ivory/50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {store.name}. Demo storefront — product imagery is illustrative.</p>
          <ul className="flex flex-wrap gap-4">
            <li><Link className={link} href="/pages/privacy-policy">Privacy</Link></li>
            <li><Link className={link} href="/pages/terms-of-service">Terms</Link></li>
            <li><Link className={link} href="/pages/about-us">About</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
