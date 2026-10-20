import { z } from "zod";

export const storeSettingsSchema = z.object({
  name: z.string().min(1).max(60),
  tagline: z.string().max(120),
  supportEmail: z.string().email(),
  supportPhone: z.string().max(30),
  whatsapp: z.string().max(30).optional().default(""),
  address: z.string().max(300),
  supportHours: z.string().max(120),
  social: z.object({
    instagram: z.string().optional().default(""),
    facebook: z.string().optional().default(""),
    youtube: z.string().optional().default(""),
    pinterest: z.string().optional().default(""),
  }),
});

export const announcementSchema = z.object({
  isActive: z.boolean(),
  messages: z.array(z.string().max(140)).max(6),
});

export const shippingSettingsSchema = z.object({
  freeShippingThreshold: z.number().int().min(0), // paise
  standardFee: z.number().int().min(0),
  expressEnabled: z.boolean(),
  expressFee: z.number().int().min(0),
  standardDays: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  expressDays: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  metroPrefixes: z.array(z.string().regex(/^\d{1,6}$/)),
  metroDaysReduction: z.number().int().min(0),
  unserviceablePrefixes: z.array(z.string().regex(/^\d{1,6}$/)),
  codEnabled: z.boolean(),
  codFee: z.number().int().min(0),
  codMaxOrderValue: z.number().int().min(0),
});

export const taxSettingsSchema = z.object({
  gstRateBps: z.number().int().min(0).max(5000), // 300 = 3%
  pricesIncludeTax: z.boolean(),
  note: z.string().max(300),
});

export const consultationSchema = z.object({
  isActive: z.boolean(),
  title: z.string().max(120),
  body: z.string().max(600),
  storeName: z.string().max(120),
  storeAddress: z.string().max(300),
  storeHours: z.string().max(120),
  mapUrl: z.string().max(500).optional().default(""),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;
export type AnnouncementSettings = z.infer<typeof announcementSchema>;
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export type TaxSettings = z.infer<typeof taxSettingsSchema>;
export type ConsultationSettings = z.infer<typeof consultationSchema>;

export const settingDefaults = {
  store: {
    name: "Aurelle Jewellery",
    tagline: "Fine jewellery, thoughtfully crafted",
    supportEmail: "care@aurelle.example",
    supportPhone: "+91 00000 00000",
    whatsapp: "",
    address: "Demo address — update in Admin › Settings",
    supportHours: "Mon–Sat, 10:00–19:00 IST",
    social: { instagram: "", facebook: "", youtube: "", pinterest: "" },
  } satisfies StoreSettings,
  announcement: {
    isActive: true,
    messages: [
      "Free insured shipping on orders above ₹25,000",
      "15-day returns on eligible pieces",
      "Book a free video consultation with our stylists",
    ],
  } satisfies AnnouncementSettings,
  shipping: {
    freeShippingThreshold: 2_500_000,
    standardFee: 49_900,
    expressEnabled: true,
    expressFee: 99_900,
    standardDays: [4, 7],
    expressDays: [2, 3],
    metroPrefixes: ["11", "40", "56", "60", "70", "50", "41", "38"],
    metroDaysReduction: 1,
    unserviceablePrefixes: ["744", "682551"],
    codEnabled: true,
    codFee: 0,
    codMaxOrderValue: 5_000_000,
  } satisfies ShippingSettings,
  tax: {
    gstRateBps: 300,
    pricesIncludeTax: true,
    note: "Prices include 3% GST applicable on jewellery.",
  } satisfies TaxSettings,
  consultation: {
    isActive: true,
    title: "Find your piece with a personal stylist",
    body: "Book a complimentary in-store or video consultation. Our stylists can help with bridal planning, sizing and custom requests.",
    storeName: "Aurelle Experience Studio (demo)",
    storeAddress: "Address to be configured in Admin › Settings",
    storeHours: "Open daily, 11:00–20:00",
    mapUrl: "",
  } satisfies ConsultationSettings,
};

export const settingSchemas = {
  store: storeSettingsSchema,
  announcement: announcementSchema,
  shipping: shippingSettingsSchema,
  tax: taxSettingsSchema,
  consultation: consultationSchema,
} as const;

export type SettingKey = keyof typeof settingSchemas;


