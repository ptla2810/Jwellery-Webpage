import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-display", display: "swap" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Aurelle Jewellery — Fine Gold & Diamond Jewellery", template: "%s | Aurelle Jewellery" },
  description: "Shop fine gold, diamond, platinum and polki jewellery online in India. Rings, earrings, necklaces, mangalsutras and bridal sets.",
  openGraph: { type: "website", locale: "en_IN", siteName: "Aurelle Jewellery" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#fbf8f3", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <a href="#main" className="sr-only z-[100] bg-ink px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
