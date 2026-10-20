import type { ArtMetal, ArtShape, ArtStone } from "../scripts/art";

export const TYPE_CATEGORIES = [
  { slug: "rings", name: "Rings", shape: "ring-solitaire", stone: "diamond", metal: "yellow", description: "Solitaires, bands and cocktail rings for every finger and every story." },
  { slug: "earrings", name: "Earrings", shape: "earring-drop", stone: "diamond", metal: "rose", description: "Studs, drops, hoops and jhumkas — from everyday sparkle to festive statement." },
  { slug: "necklaces", name: "Necklaces", shape: "necklace", stone: "emerald", metal: "yellow", description: "Chokers, layered and statement necklaces crafted to frame the neckline." },
  { slug: "pendants", name: "Pendants", shape: "pendant", stone: "diamond", metal: "white", description: "Delicate pendants to wear alone or layer with your favourite chain." },
  { slug: "chains", name: "Chains", shape: "chain", stone: "none", metal: "yellow", description: "Gold and platinum chains in classic and contemporary link styles." },
  { slug: "bangles", name: "Bangles", shape: "bangle", stone: "none", metal: "yellow", description: "Timeless bangles in gold and diamond, sized for the perfect fit." },
  { slug: "bracelets", name: "Bracelets", shape: "bracelet", stone: "diamond", metal: "white", description: "Tennis, chain and charm bracelets for stacking or wearing solo." },
  { slug: "mangalsutras", name: "Mangalsutras", shape: "mangalsutra", stone: "diamond", metal: "yellow", description: "Modern and traditional mangalsutras made for everyday wear." },
  { slug: "nose-pins", name: "Nose Pins", shape: "nosepin", stone: "diamond", metal: "yellow", description: "Fine nose pins and studs with diamonds and gemstones." },
  { slug: "anklets", name: "Anklets", shape: "anklet", stone: "none", metal: "silver", description: "Light, comfortable anklets in silver and gold." },
  { slug: "jewellery-sets", name: "Jewellery Sets", shape: "set", stone: "polki", metal: "yellow", description: "Coordinated necklace and earring sets for weddings and celebrations." },
  { slug: "mens-jewellery", name: "Men's Jewellery", shape: "ring-signet", stone: "none", metal: "yellow", description: "Kadas, chains, signet rings and bracelets designed for men." },
  { slug: "kids-jewellery", name: "Children's Jewellery", shape: "earring-stud", stone: "none", metal: "yellow", description: "Lightweight, child-safe designs for little ones." },
] as const satisfies readonly { slug: string; name: string; shape: ArtShape; stone: ArtStone; metal: ArtMetal; description: string }[];

export const MATERIAL_CATEGORIES = [
  { slug: "gold", name: "Gold", description: "Hallmark-ready gold jewellery in 22K, 18K and 14K." },
  { slug: "diamond", name: "Diamond", description: "Natural diamond jewellery in gold and platinum." },
  { slug: "platinum", name: "Platinum", description: "Platinum jewellery for a cool, enduring shine." },
  { slug: "silver", name: "Silver", description: "925 sterling silver jewellery for everyday elegance." },
  { slug: "gemstone", name: "Gemstone Jewellery", description: "Rubies, emeralds and sapphires set in precious metal." },
  { slug: "polki", name: "Polki Jewellery", description: "Uncut-diamond polki in traditional settings." },
  { slug: "kundan", name: "Kundan Jewellery", description: "Kundan craftsmanship for festive and bridal looks." },
  { slug: "pearl", name: "Pearl Jewellery", description: "Lustrous pearls in classic and modern designs." },
] as const;

export const OCCASION_CATEGORIES = [
  { slug: "wedding", name: "Wedding" },
  { slug: "engagement", name: "Engagement" },
  { slug: "everyday-wear", name: "Everyday Wear" },
  { slug: "office-wear", name: "Office Wear" },
  { slug: "festive-wear", name: "Festive Wear" },
  { slug: "party-wear", name: "Party Wear" },
  { slug: "anniversary-gifts", name: "Anniversary Gifts" },
  { slug: "birthday-gifts", name: "Birthday Gifts" },
] as const;

export const COLLECTIONS = [
  { slug: "new-arrivals", name: "New Arrivals", rule: "NEW_ARRIVALS", palette: "ivory", description: "The newest pieces from our studio." },
  { slug: "best-sellers", name: "Best Sellers", rule: "BEST_SELLERS", palette: "champagne", description: "The designs our customers love most." },
  { slug: "trending-now", name: "Trending Now", rule: "TRENDING", palette: "blush", description: "What everyone is wearing this season." },
  { slug: "lightweight", name: "Lightweight Jewellery", rule: "MANUAL", palette: "ivory", description: "Feather-light gold and diamonds for all-day comfort." },
  { slug: "traditional", name: "Traditional Collection", rule: "MANUAL", palette: "velvet", description: "Heritage motifs reimagined by master karigars." },
  { slug: "contemporary", name: "Contemporary Collection", rule: "MANUAL", palette: "midnight", description: "Clean lines and modern geometry." },
  { slug: "bridal", name: "Bridal Collection", rule: "MANUAL", palette: "velvet", description: "Heirloom pieces for the most important day." },
  { slug: "premium", name: "Premium Collection", rule: "MANUAL", palette: "emerald", description: "Our finest diamonds, polki and high jewellery." },
  { slug: "gifts-for-her", name: "Gifts for Her", rule: "MANUAL", palette: "blush", description: "Thoughtful pieces she will treasure." },
  { slug: "gifts-for-him", name: "Gifts for Him", rule: "MANUAL", palette: "midnight", description: "Refined jewellery for him." },
] as const;

type SeedMetal = "YELLOW_GOLD" | "WHITE_GOLD" | "ROSE_GOLD" | "PLATINUM" | "SILVER";

export type SeedProduct = {
  name: string;
  type: (typeof TYPE_CATEGORIES)[number]["slug"];
  shape: ArtShape;
  metal: SeedMetal;
  purity: string;
  stone: ArtStone;
  materials: string[];
  occasions: string[];
  collections: string[];
  price: number; // rupees, incl. GST
  compareAt?: number;
  weight: number; // gross grams
  carat?: number;
  clarity?: string;
  color?: string;
  gemstone?: string;
  style: "Traditional" | "Contemporary" | "Minimal" | "Statement";
  gender?: "WOMEN" | "MEN" | "KIDS" | "UNISEX";
  sizes?: "ring" | "chain" | "bangle";
  stock: number;
  bestSeller?: boolean;
  trending?: boolean;
  featured?: boolean;
  lightweight?: boolean;
  estimated?: boolean;
  daysAgo: number;
  blurb: string;
};

export const PRODUCTS: SeedProduct[] = [
  // Rings
  { name: "Aira Solitaire Ring", type: "rings", shape: "ring-solitaire", metal: "YELLOW_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["engagement", "anniversary-gifts"], collections: ["bridal", "gifts-for-her"], price: 64990, weight: 3.2, carat: 0.3, clarity: "VS1", color: "G", gemstone: "Diamond", style: "Minimal", sizes: "ring", stock: 9, bestSeller: true, featured: true, daysAgo: 160, blurb: "A single brilliant-cut diamond held high in a four-prong setting." },
  { name: "Noor Eternity Band", type: "rings", shape: "ring-band", metal: "WHITE_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["anniversary-gifts", "engagement"], collections: ["contemporary", "gifts-for-her"], price: 48500, compareAt: 53900, weight: 2.8, carat: 0.42, clarity: "VS2", color: "H", gemstone: "Diamond", style: "Contemporary", sizes: "ring", stock: 7, trending: true, daysAgo: 40, blurb: "A continuous line of diamonds that catches light from every angle." },
  { name: "Gulnar Ruby Cocktail Ring", type: "rings", shape: "ring-cluster", metal: "YELLOW_GOLD", purity: "22K", stone: "ruby", materials: ["gold", "gemstone"], occasions: ["party-wear", "festive-wear"], collections: ["traditional", "premium"], price: 72900, weight: 6.4, gemstone: "Ruby", style: "Statement", sizes: "ring", stock: 4, daysAgo: 95, blurb: "A rich ruby centre framed by a halo of gold beads." },
  { name: "Ira Everyday Gold Band", type: "rings", shape: "ring-band", metal: "YELLOW_GOLD", purity: "22K", stone: "none", materials: ["gold"], occasions: ["everyday-wear", "office-wear"], collections: ["lightweight"], price: 18900, weight: 2.1, style: "Minimal", sizes: "ring", stock: 18, lightweight: true, bestSeller: true, daysAgo: 220, blurb: "A polished, comfort-fit band to wear every single day." },
  { name: "Seher Rose Gold Promise Ring", type: "rings", shape: "ring-solitaire", metal: "ROSE_GOLD", purity: "14K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["birthday-gifts", "anniversary-gifts"], collections: ["gifts-for-her", "lightweight"], price: 22900, weight: 1.9, carat: 0.08, clarity: "SI1", color: "H", gemstone: "Diamond", style: "Minimal", sizes: "ring", stock: 15, lightweight: true, trending: true, daysAgo: 12, blurb: "A petite diamond in warm rose gold — a quiet promise." },
  { name: "Tara Platinum Solitaire", type: "rings", shape: "ring-solitaire", metal: "PLATINUM", purity: "PT950", stone: "diamond", materials: ["platinum", "diamond"], occasions: ["engagement"], collections: ["premium", "bridal"], price: 189000, weight: 4.6, carat: 0.7, clarity: "VVS2", color: "F", gemstone: "Diamond", style: "Minimal", sizes: "ring", stock: 3, featured: true, daysAgo: 70, blurb: "A bright 0.70 ct diamond set in naturally white platinum." },
  { name: "Vana Emerald Halo Ring", type: "rings", shape: "ring-cluster", metal: "WHITE_GOLD", purity: "18K", stone: "emerald", materials: ["gold", "gemstone", "diamond"], occasions: ["party-wear", "anniversary-gifts"], collections: ["premium", "contemporary"], price: 86500, weight: 4.1, carat: 0.24, clarity: "VS2", color: "G", gemstone: "Emerald", style: "Statement", sizes: "ring", stock: 0, daysAgo: 30, blurb: "A vivid emerald encircled by diamonds. Currently out of stock." },

  // Earrings
  { name: "Mira Diamond Studs", type: "earrings", shape: "earring-stud", metal: "WHITE_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["everyday-wear", "office-wear", "birthday-gifts"], collections: ["gifts-for-her", "lightweight"], price: 38900, weight: 2.2, carat: 0.2, clarity: "VS2", color: "G", gemstone: "Diamond", style: "Minimal", stock: 20, bestSeller: true, lightweight: true, daysAgo: 200, blurb: "Floral diamond studs with a centre stone that sparkles all day." },
  { name: "Rani Ruby Jhumkas", type: "earrings", shape: "earring-jhumka", metal: "YELLOW_GOLD", purity: "22K", stone: "ruby", materials: ["gold", "gemstone"], occasions: ["wedding", "festive-wear"], collections: ["traditional", "bridal"], price: 96500, weight: 11.8, gemstone: "Ruby", style: "Traditional", stock: 5, bestSeller: true, featured: true, estimated: true, daysAgo: 130, blurb: "Temple-inspired jhumkas with ruby accents and a fringe of gold beads." },
  { name: "Lehar Gold Hoops", type: "earrings", shape: "earring-hoop", metal: "YELLOW_GOLD", purity: "18K", stone: "none", materials: ["gold"], occasions: ["everyday-wear", "office-wear"], collections: ["contemporary", "lightweight"], price: 24900, weight: 3.0, style: "Contemporary", stock: 14, lightweight: true, trending: true, daysAgo: 20, blurb: "Sleek, lightweight hoops in polished 18K gold." },
  { name: "Moti Pearl Drops", type: "earrings", shape: "earring-drop", metal: "YELLOW_GOLD", purity: "18K", stone: "pearl", materials: ["gold", "pearl"], occasions: ["office-wear", "party-wear"], collections: ["contemporary", "gifts-for-her"], price: 21500, weight: 2.6, gemstone: "Pearl", style: "Contemporary", stock: 11, daysAgo: 8, blurb: "Freshwater pearls suspended from fine gold drops." },
  { name: "Saanjh Sapphire Hoops", type: "earrings", shape: "earring-hoop", metal: "WHITE_GOLD", purity: "18K", stone: "sapphire", materials: ["gold", "gemstone"], occasions: ["party-wear"], collections: ["premium"], price: 58900, compareAt: 64900, weight: 4.0, gemstone: "Sapphire", style: "Statement", stock: 6, daysAgo: 55, blurb: "Blue sapphires set along the front of slender white-gold hoops." },
  { name: "Chandni Polki Drops", type: "earrings", shape: "earring-drop", metal: "YELLOW_GOLD", purity: "22K", stone: "polki", materials: ["gold", "polki"], occasions: ["wedding", "festive-wear"], collections: ["bridal", "traditional", "premium"], price: 124900, weight: 14.2, gemstone: "Polki", style: "Traditional", stock: 3, estimated: true, daysAgo: 85, blurb: "Uncut polki diamonds in a classic drop silhouette." },

  // Necklaces
  { name: "Rajkumari Kundan Choker", type: "necklaces", shape: "necklace-choker", metal: "YELLOW_GOLD", purity: "22K", stone: "kundan", materials: ["gold", "kundan"], occasions: ["wedding", "festive-wear"], collections: ["bridal", "traditional", "premium"], price: 245000, weight: 38.5, gemstone: "Kundan", style: "Traditional", stock: 2, featured: true, estimated: true, daysAgo: 110, blurb: "A regal kundan choker with drops, handcrafted for the bride." },
  { name: "Aaina Diamond Necklace", type: "necklaces", shape: "necklace", metal: "WHITE_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["party-wear", "anniversary-gifts"], collections: ["premium", "contemporary"], price: 168000, weight: 12.4, carat: 1.1, clarity: "VS1", color: "G", gemstone: "Diamond", style: "Statement", sizes: "chain", stock: 3, bestSeller: true, daysAgo: 75, blurb: "Graduated diamonds that flow into a radiant centre drop." },
  { name: "Panna Emerald Necklace", type: "necklaces", shape: "necklace", metal: "ROSE_GOLD", purity: "18K", stone: "emerald", materials: ["gold", "gemstone"], occasions: ["festive-wear", "party-wear"], collections: ["premium"], price: 112500, weight: 10.8, gemstone: "Emerald", style: "Statement", stock: 4, trending: true, daysAgo: 18, blurb: "Emeralds in rose gold, with a marquise centrepiece." },
  { name: "Suhana Gold Necklace", type: "necklaces", shape: "necklace", metal: "YELLOW_GOLD", purity: "22K", stone: "none", materials: ["gold"], occasions: ["festive-wear", "wedding"], collections: ["traditional"], price: 135900, weight: 18.6, style: "Traditional", stock: 5, estimated: true, daysAgo: 150, blurb: "Hand-finished gold beads and a sculpted centre motif." },

  // Pendants
  { name: "Dil Diamond Heart Pendant", type: "pendants", shape: "pendant", metal: "ROSE_GOLD", purity: "14K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["birthday-gifts", "anniversary-gifts"], collections: ["gifts-for-her", "lightweight"], price: 17900, weight: 1.4, carat: 0.06, clarity: "SI1", color: "H", gemstone: "Diamond", style: "Minimal", stock: 22, bestSeller: true, lightweight: true, daysAgo: 25, blurb: "A tiny heart with a diamond at its centre. Chain sold separately." },
  { name: "Chandra Disc Pendant", type: "pendants", shape: "pendant", metal: "YELLOW_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["everyday-wear", "office-wear"], collections: ["contemporary"], price: 26500, weight: 2.3, carat: 0.1, clarity: "VS2", color: "H", gemstone: "Diamond", style: "Contemporary", stock: 12, daysAgo: 5, blurb: "A brushed gold disc framing a single diamond." },
  { name: "Neela Sapphire Pendant", type: "pendants", shape: "pendant", metal: "WHITE_GOLD", purity: "18K", stone: "sapphire", materials: ["gold", "gemstone"], occasions: ["birthday-gifts", "party-wear"], collections: ["gifts-for-her"], price: 31900, compareAt: 35500, weight: 2.0, gemstone: "Sapphire", style: "Contemporary", stock: 8, daysAgo: 62, blurb: "A deep blue sapphire drop on white gold." },
  { name: "Shubh Silver Pendant", type: "pendants", shape: "pendant", metal: "SILVER", purity: "925", stone: "none", materials: ["silver"], occasions: ["everyday-wear", "birthday-gifts"], collections: ["lightweight"], price: 2490, weight: 3.5, style: "Minimal", stock: 40, lightweight: true, daysAgo: 3, blurb: "Polished sterling silver pendant — an easy everyday gift." },

  // Chains
  { name: "Rope Gold Chain", type: "chains", shape: "chain", metal: "YELLOW_GOLD", purity: "22K", stone: "none", materials: ["gold"], occasions: ["everyday-wear"], collections: ["traditional"], price: 78900, weight: 10.5, style: "Traditional", sizes: "chain", stock: 9, bestSeller: true, estimated: true, daysAgo: 180, blurb: "A classic rope weave with a secure lobster clasp." },
  { name: "Sleek Box Chain", type: "chains", shape: "chain", metal: "YELLOW_GOLD", purity: "18K", stone: "none", materials: ["gold"], occasions: ["everyday-wear", "office-wear"], collections: ["lightweight", "contemporary"], price: 21900, weight: 2.9, style: "Minimal", sizes: "chain", stock: 16, lightweight: true, daysAgo: 45, blurb: "A fine box chain — perfect for pendants." },
  { name: "Platinum Curb Chain", type: "chains", shape: "chain", metal: "PLATINUM", purity: "PT950", stone: "none", materials: ["platinum"], occasions: ["everyday-wear"], collections: ["gifts-for-him"], price: 92500, weight: 12.0, style: "Contemporary", gender: "UNISEX", sizes: "chain", stock: 5, daysAgo: 100, blurb: "Substantial platinum curb links with a satin finish." },

  // Bangles
  { name: "Kangan Classic Gold Bangles (Pair)", type: "bangles", shape: "bangle", metal: "YELLOW_GOLD", purity: "22K", stone: "none", materials: ["gold"], occasions: ["wedding", "festive-wear"], collections: ["traditional", "bridal"], price: 158000, weight: 21.0, style: "Traditional", sizes: "bangle", stock: 6, bestSeller: true, estimated: true, daysAgo: 140, blurb: "A pair of hand-engraved bangles in rich 22K gold." },
  { name: "Tarini Diamond Bangle", type: "bangles", shape: "bangle", metal: "ROSE_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["anniversary-gifts", "party-wear"], collections: ["premium", "contemporary"], price: 142000, compareAt: 155000, weight: 11.6, carat: 0.66, clarity: "VS2", color: "H", gemstone: "Diamond", style: "Contemporary", sizes: "bangle", stock: 4, trending: true, daysAgo: 22, blurb: "A slim rose-gold bangle with a row of diamonds." },
  { name: "Halki Daily Bangle", type: "bangles", shape: "bangle", metal: "YELLOW_GOLD", purity: "18K", stone: "none", materials: ["gold"], occasions: ["everyday-wear", "office-wear"], collections: ["lightweight"], price: 39900, weight: 5.2, style: "Minimal", sizes: "bangle", stock: 12, lightweight: true, daysAgo: 35, blurb: "A light, hollow bangle for everyday stacking." },

  // Bracelets
  { name: "Nazakat Tennis Bracelet", type: "bracelets", shape: "bracelet", metal: "WHITE_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["anniversary-gifts", "party-wear"], collections: ["premium", "gifts-for-her"], price: 198000, weight: 9.4, carat: 1.5, clarity: "VS1", color: "G", gemstone: "Diamond", style: "Statement", stock: 2, featured: true, daysAgo: 60, blurb: "A continuous line of diamonds in a supple tennis setting." },
  { name: "Link Gold Bracelet", type: "bracelets", shape: "bracelet", metal: "YELLOW_GOLD", purity: "18K", stone: "none", materials: ["gold"], occasions: ["everyday-wear", "office-wear"], collections: ["contemporary", "lightweight"], price: 34900, weight: 4.6, style: "Contemporary", stock: 10, lightweight: true, daysAgo: 14, blurb: "Rounded gold links with a polished finish." },
  { name: "Ruby Charm Bracelet", type: "bracelets", shape: "bracelet", metal: "ROSE_GOLD", purity: "14K", stone: "ruby", materials: ["gold", "gemstone"], occasions: ["birthday-gifts"], collections: ["gifts-for-her"], price: 28900, weight: 3.4, gemstone: "Ruby", style: "Contemporary", stock: 9, daysAgo: 48, blurb: "Tiny ruby charms on a fine rose-gold chain." },

  // Mangalsutras
  { name: "Saath Diamond Mangalsutra", type: "mangalsutras", shape: "mangalsutra", metal: "YELLOW_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["wedding", "everyday-wear"], collections: ["bridal", "contemporary"], price: 54900, weight: 5.8, carat: 0.12, clarity: "SI1", color: "H", gemstone: "Diamond", style: "Contemporary", sizes: "chain", stock: 10, bestSeller: true, daysAgo: 90, blurb: "Black beads and a twin-vati pendant with a diamond accent." },
  { name: "Parampara Gold Mangalsutra", type: "mangalsutras", shape: "mangalsutra", metal: "YELLOW_GOLD", purity: "22K", stone: "none", materials: ["gold"], occasions: ["wedding"], collections: ["traditional", "bridal"], price: 82900, weight: 11.2, style: "Traditional", sizes: "chain", stock: 6, estimated: true, daysAgo: 170, blurb: "A traditional double-strand mangalsutra in 22K gold." },
  { name: "Roz Lightweight Mangalsutra", type: "mangalsutras", shape: "mangalsutra", metal: "ROSE_GOLD", purity: "14K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["everyday-wear", "office-wear"], collections: ["lightweight"], price: 29900, weight: 2.7, carat: 0.05, clarity: "SI1", color: "H", gemstone: "Diamond", style: "Minimal", stock: 13, lightweight: true, trending: true, daysAgo: 10, blurb: "A fine, office-friendly mangalsutra in rose gold." },

  // Nose pins
  { name: "Phool Diamond Nose Pin", type: "nose-pins", shape: "nosepin", metal: "YELLOW_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["everyday-wear", "festive-wear"], collections: ["lightweight", "traditional"], price: 9900, weight: 0.4, carat: 0.04, clarity: "SI1", color: "H", gemstone: "Diamond", style: "Traditional", stock: 30, lightweight: true, bestSeller: true, daysAgo: 120, blurb: "A tiny diamond flower for the nose." },
  { name: "Pankhudi Rose Gold Nose Pin", type: "nose-pins", shape: "nosepin", metal: "ROSE_GOLD", purity: "14K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["everyday-wear"], collections: ["lightweight"], price: 7400, weight: 0.3, carat: 0.03, clarity: "SI2", color: "I", gemstone: "Diamond", style: "Minimal", stock: 25, lightweight: true, daysAgo: 6, blurb: "Delicate petals in rose gold with diamond accents." },

  // Anklets
  { name: "Ghungroo Silver Anklets (Pair)", type: "anklets", shape: "anklet", metal: "SILVER", purity: "925", stone: "none", materials: ["silver"], occasions: ["festive-wear", "everyday-wear"], collections: ["traditional"], price: 4590, weight: 28.0, style: "Traditional", stock: 24, bestSeller: true, daysAgo: 135, blurb: "Sterling silver anklets with softly chiming ghungroos." },
  { name: "Minimal Gold Anklet", type: "anklets", shape: "anklet", metal: "YELLOW_GOLD", purity: "18K", stone: "none", materials: ["gold"], occasions: ["everyday-wear", "party-wear"], collections: ["lightweight", "contemporary"], price: 16900, weight: 2.2, style: "Minimal", stock: 9, lightweight: true, daysAgo: 28, blurb: "A whisper-fine gold anklet." },

  // Sets
  { name: "Shahi Polki Bridal Set", type: "jewellery-sets", shape: "set", metal: "YELLOW_GOLD", purity: "22K", stone: "polki", materials: ["gold", "polki"], occasions: ["wedding"], collections: ["bridal", "premium", "traditional"], price: 425000, weight: 62.0, gemstone: "Polki", style: "Traditional", stock: 1, featured: true, estimated: true, daysAgo: 100, blurb: "Necklace and earrings in polki and gold — an heirloom in the making." },
  { name: "Gulaab Ruby Set", type: "jewellery-sets", shape: "set", metal: "YELLOW_GOLD", purity: "22K", stone: "ruby", materials: ["gold", "gemstone"], occasions: ["wedding", "festive-wear"], collections: ["bridal", "traditional"], price: 289000, weight: 41.0, gemstone: "Ruby", style: "Traditional", stock: 2, estimated: true, daysAgo: 65, blurb: "Ruby and gold necklace with matching drop earrings." },
  { name: "Aurora Diamond Set", type: "jewellery-sets", shape: "set", metal: "WHITE_GOLD", purity: "18K", stone: "diamond", materials: ["gold", "diamond"], occasions: ["engagement", "party-wear"], collections: ["premium", "contemporary"], price: 315000, weight: 18.0, carat: 2.1, clarity: "VS1", color: "G", gemstone: "Diamond", style: "Statement", stock: 2, trending: true, daysAgo: 16, blurb: "A contemporary diamond necklace and earring set." },
  { name: "Moti Mala Pearl Set", type: "jewellery-sets", shape: "set", metal: "SILVER", purity: "925", stone: "pearl", materials: ["silver", "pearl"], occasions: ["festive-wear", "party-wear"], collections: ["gifts-for-her"], price: 8990, compareAt: 10990, weight: 32.0, gemstone: "Pearl", style: "Traditional", stock: 14, daysAgo: 50, blurb: "Pearls on sterling silver with matching earrings." },

  // Men's
  { name: "Veer Gold Kada", type: "mens-jewellery", shape: "kada", metal: "YELLOW_GOLD", purity: "22K", stone: "none", materials: ["gold"], occasions: ["festive-wear", "wedding"], collections: ["gifts-for-him", "traditional"], price: 168500, weight: 24.0, style: "Traditional", gender: "MEN", sizes: "bangle", stock: 4, bestSeller: true, estimated: true, daysAgo: 115, blurb: "A bold, ridged kada in solid 22K gold." },
  { name: "Raja Signet Ring", type: "mens-jewellery", shape: "ring-signet", metal: "YELLOW_GOLD", purity: "18K", stone: "none", materials: ["gold"], occasions: ["birthday-gifts", "anniversary-gifts"], collections: ["gifts-for-him"], price: 46900, weight: 6.5, style: "Contemporary", gender: "MEN", sizes: "ring", stock: 7, trending: true, daysAgo: 9, blurb: "A cushion-shaped signet ring with a brushed face." },
  { name: "Arjun Platinum Band", type: "mens-jewellery", shape: "ring-band", metal: "PLATINUM", purity: "PT950", stone: "none", materials: ["platinum"], occasions: ["engagement", "anniversary-gifts"], collections: ["gifts-for-him", "contemporary"], price: 58900, weight: 6.8, style: "Minimal", gender: "MEN", sizes: "ring", stock: 8, daysAgo: 80, blurb: "A comfort-fit platinum band with a matte centre." },
  { name: "Silver Curb Bracelet for Men", type: "mens-jewellery", shape: "bracelet", metal: "SILVER", purity: "925", stone: "none", materials: ["silver"], occasions: ["everyday-wear", "birthday-gifts"], collections: ["gifts-for-him"], price: 5990, weight: 22.0, style: "Contemporary", gender: "MEN", stock: 18, daysAgo: 33, blurb: "Solid sterling-silver curb links for him." },
  { name: "Shaurya Gold Chain for Men", type: "mens-jewellery", shape: "chain", metal: "YELLOW_GOLD", purity: "22K", stone: "none", materials: ["gold"], occasions: ["festive-wear"], collections: ["gifts-for-him"], price: 118000, weight: 15.5, style: "Traditional", gender: "MEN", sizes: "chain", stock: 5, estimated: true, daysAgo: 145, blurb: "A heavy gold chain with a box clasp." },

  // Kids
  { name: "Nanhi Gold Studs", type: "kids-jewellery", shape: "earring-stud", metal: "YELLOW_GOLD", purity: "18K", stone: "none", materials: ["gold"], occasions: ["birthday-gifts"], collections: ["lightweight"], price: 8900, weight: 1.0, style: "Minimal", gender: "KIDS", stock: 20, lightweight: true, daysAgo: 42, blurb: "Screw-back gold studs, sized for little ears." },
  { name: "Little Star Silver Pendant", type: "kids-jewellery", shape: "pendant", metal: "SILVER", purity: "925", stone: "none", materials: ["silver"], occasions: ["birthday-gifts"], collections: [], price: 1990, weight: 2.0, style: "Minimal", gender: "KIDS", stock: 30, lightweight: true, daysAgo: 4, blurb: "A rounded silver pendant for children." },
  { name: "Baby Nazariya Bracelet", type: "kids-jewellery", shape: "bracelet", metal: "YELLOW_GOLD", purity: "18K", stone: "none", materials: ["gold"], occasions: ["birthday-gifts"], collections: [], price: 14900, weight: 1.8, style: "Traditional", gender: "KIDS", stock: 6, lightweight: true, daysAgo: 58, blurb: "A traditional baby bracelet with black beads." },
];

export const POLICY_PAGES = [
  {
    slug: "shipping-policy",
    title: "Shipping Policy",
    body: "## Delivery\nOrders are shipped fully insured through our logistics partners. Estimated delivery dates are shown at checkout based on your PIN code.\n\n## Shipping charges\nShipping charges and free-shipping thresholds are shown in your cart and at checkout.\n\n## Demo content\nThis policy is placeholder text for the demo store. Replace it with your business's actual policy in Admin › Content.",
  },
  {
    slug: "returns-and-exchange",
    title: "Returns & Exchange",
    body: "## Eligibility\nEligible items may be returned or exchanged within 15 days of delivery, in unused condition with original packaging and documentation.\n\n## Exclusions\nCustomised, engraved and resized pieces may not be eligible.\n\n## How to request\nSign in, open the order in My Account › Orders and choose Request return or exchange.\n\n## Demo content\nThis policy is placeholder text. Replace it with your actual policy in Admin › Content.",
  },
  {
    slug: "warranty",
    title: "Warranty & Lifetime Care",
    body: "## Manufacturing defects\nDetails of warranty coverage should be added here by the business.\n\n## Demo content\nThis page is placeholder text. No warranty is offered by this demo store.",
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    body: "## What we collect\nWe collect the information you provide to place orders and manage your account: name, email, phone number and delivery addresses.\n\n## Payments\nCard and UPI details are handled by our payment provider; we never store card numbers or CVVs.\n\n## Your choices\nYou can update your profile and addresses from My Account, unsubscribe from newsletters at any time, and contact us to request deletion of your account.\n\n## Demo content\nReview this policy with legal counsel before going live.",
  },
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    body: "## Pricing\nAll prices are in Indian Rupees and include applicable GST unless stated otherwise. For weight-based gold jewellery, displayed prices are estimates and the final invoice reflects actual weight.\n\n## Demo content\nThese terms are placeholder text. Replace them before going live.",
  },
  {
    slug: "about-us",
    title: "About Aurelle",
    body: "## Our story\nAurelle is a demo jewellery brand created to showcase a modern Indian fine-jewellery storefront.\n\n## Craftsmanship\nEach design pairs traditional techniques with contemporary forms.\n\n## Authenticity\nCertification and hallmarking details are shown on each product only when provided by the merchant.",
  },
];
