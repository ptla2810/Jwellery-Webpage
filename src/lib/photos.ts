/**
 * Photography for the demo catalogue. Every value is an Unsplash image id (https://images.unsplash.com/photo-<id>),
 * used under the Unsplash License (free for commercial use, no attribution required). These are representative
 * stock photos, not pictures of the actual products — replace them with your own product photography before launch.
 *
 * Files live in public/images/photos/<id>.jpg; `npm run photos:fetch` downloads any that are missing.
 */

export const photoUrl = (id: string) => `/images/photos/${id}.jpg`;

/** Product name → photos in display order (the second is shown on hover). */
export const PRODUCT_PHOTOS: Record<string, string[]> = {
  "Aira Solitaire Ring": ["1598560917807-1bae44bd2be8", "1786228578869-71ecde3dc43e"],
  "Noor Eternity Band": ["1589674668791-4889d2bba4c6", "1762505464529-1a37df13674f"],
  "Gulnar Ruby Cocktail Ring": ["1611955167811-4711904bb9f8", "1625516152414-8f33eef3d660"],
  "Ira Everyday Gold Band": ["1622398925373-3f91b1e275f5", "1599458349289-18f0ee82e6ed"],
  "Seher Rose Gold Promise Ring": ["1631982686092-e6561a853187", "1631982690223-8aa4be0a2497"],
  "Tara Platinum Solitaire": ["1768423685978-42fe24ec39a0", "1762505464779-17f78cbfa8b4"],
  "Vana Emerald Halo Ring": ["1605100804763-247f67b3557e", "1762505464756-adda1bd2a343"],
  "Mira Diamond Studs": ["1599029576074-2f79b6c25401", "1770721478216-3e5dbbe8dcc2"],
  "Rani Ruby Jhumkas": ["1653227907864-560dce4c252d", "1778148046574-c1509f5a40d4"],
  "Lehar Gold Hoops": ["1615655114865-4cc1bda5901e", "1671644730555-916aa8d8157f"],
  "Moti Pearl Drops": ["1682822749969-61a63203c501", "1763628212781-7d52844cf358"],
  "Saanjh Sapphire Hoops": ["1573717008136-5a9f0820e8bf", "1764591576264-ad2e0e4e793c"],
  "Chandni Polki Drops": ["1643387774154-4ec59518f9a5", "1597055952513-4e9bce9345c3"],
  "Rajkumari Kundan Choker": ["1707149974686-0c198fdebd51", "1738754719555-05aca36707b1"],
  "Aaina Diamond Necklace": ["1743264385411-57c883bdc0ea", "1749125380446-60fd7c5ba4cb"],
  "Panna Emerald Necklace": ["1744822220368-c380740bfc7f", "1738754712726-d126c15e206b"],
  "Suhana Gold Necklace": ["1758995115857-2de1eb6283d0", "1758995115682-1452a1a9e35b"],
  "Dil Diamond Heart Pendant": ["1623321673989-830eff0fd59f", "1720528347713-803c714e9d09"],
  "Chandra Disc Pendant": ["1783541507490-edb026e2a961", "1773929345739-94db8a4ccd0c"],
  "Neela Sapphire Pendant": ["1599643477877-530eb83abc8e", "1589128777073-263566ae5e4d"],
  "Shubh Silver Pendant": ["1598560917505-59a3ad559071", "1602752250055-5ebb552fc3ae"],
  "Rope Gold Chain": ["1771734065116-61e16b353ded", "1611107683227-e9060eccd846"],
  "Sleek Box Chain": ["1616837874254-8d5aaa63e273", "1569397288884-4d43d6738fbd"],
  "Platinum Curb Chain": ["1605884878538-6468614df578"],
  "Kangan Classic Gold Bangles (Pair)": ["1758995116383-f51775896add", "1728381031272-ba3f537feadd"],
  "Tarini Diamond Bangle": ["1787769499046-8a94b2de1f62", "1690175867343-2af70ea57537"],
  "Halki Daily Bangle": ["1740567389909-b36e9cadbef9", "1741071520904-37ef3c0fea09"],
  "Nazakat Tennis Bracelet": ["1763029513623-37d488cb97b1", "1573408301185-9146fe634ad0"],
  "Link Gold Bracelet": ["1602173574767-37ac01994b2a", "1777999802051-f6f0296e76af"],
  "Ruby Charm Bracelet": ["1689397136362-dce64e557fcc", "1778000000743-87e855360c51"],
  "Saath Diamond Mangalsutra": ["1787520542687-e2647225dc8f", "1750492272603-43888a3fee4d"],
  "Parampara Gold Mangalsutra": ["1750492272603-43888a3fee4d", "1787520542687-e2647225dc8f"],
  "Roz Lightweight Mangalsutra": ["1750492272603-43888a3fee4d"],
  "Phool Diamond Nose Pin": ["1785559628246-d1530927c2ab", "1710301443142-b9a3883a8b59"],
  "Pankhudi Rose Gold Nose Pin": ["1710301443142-b9a3883a8b59", "1785559628246-d1530927c2ab"],
  "Ghungroo Silver Anklets (Pair)": ["1760163287823-8786a65fd269"],
  "Minimal Gold Anklet": ["1744722091259-ed1cf11ac97f"],
  "Shahi Polki Bridal Set": ["1787831082777-69934137bda7", "1738754719555-05aca36707b1"],
  "Gulaab Ruby Set": ["1756483560049-e7b2208f99a0", "1611598935678-c88dca238fce"],
  "Aurora Diamond Set": ["1761569105762-c54a69466d06", "1762505464446-c0760d740aee"],
  "Moti Mala Pearl Set": ["1515562141207-7a88fb7ce338", "1654699991494-892326ee8171"],
  "Veer Gold Kada": ["1762505465234-de8b802614d9"],
  "Raja Signet Ring": ["1638382874010-aa4e76fe267d", "1612285127323-1837364f9da0"],
  "Arjun Platinum Band": ["1784822041171-13e87aebc1bf", "1628926379972-9843ad139a8c"],
  "Silver Curb Bracelet for Men": ["1774294546043-df9ecc9bd70e", "1639065643006-e217c4fee12e"],
  "Shaurya Gold Chain for Men": ["1613498510372-8901cad084a2", "1762505465234-de8b802614d9"],
  "Nanhi Gold Studs": ["1727990865600-91f8cb8b0168"],
  "Little Star Silver Pendant": ["1506630448388-4e683c67ddb0"],
  "Baby Nazariya Bracelet": ["1757331631646-0e1bca72b725", "1778000000743-87e855360c51"],
};

/** Category slug → tile image. */
export const CATEGORY_PHOTOS: Record<string, string> = {
  "rings": "1762505464779-17f78cbfa8b4",
  "earrings": "1590166223826-12dee1677420",
  "necklaces": "1694062045776-f48d9b6de57e",
  "pendants": "1762505464446-c0760d740aee",
  "chains": "1616837874254-8d5aaa63e273",
  "bangles": "1740567389909-b36e9cadbef9",
  "bracelets": "1761222101900-9c9e34fac2ce",
  "mangalsutras": "1750492272603-43888a3fee4d",
  "nose-pins": "1785559628246-d1530927c2ab",
  "anklets": "1744722091259-ed1cf11ac97f",
  "jewellery-sets": "1738754712726-d126c15e206b",
  "mens-jewellery": "1613498510372-8901cad084a2",
  "kids-jewellery": "1727990865600-91f8cb8b0168",
  "gold": "1611107683227-e9060eccd846",
  "diamond": "1768423685978-42fe24ec39a0",
  "platinum": "1589674668791-4889d2bba4c6",
  "silver": "1605884878538-6468614df578",
  "gemstone": "1592317295760-5c1f677dfc78",
  "polki": "1787831082777-69934137bda7",
  "kundan": "1707149974686-0c198fdebd51",
  "pearl": "1515562141207-7a88fb7ce338",
  "wedding": "1617633150878-7df1d12a9a57",
  "engagement": "1780250784120-c83d1bbbebe8",
  "everyday-wear": "1611652022419-a9419f74343d",
  "office-wear": "1611653842967-39eb011b2ca3",
  "festive-wear": "1673413349218-ba4de23c2958",
  "party-wear": "1740431377901-c2f28d50c759",
  "anniversary-gifts": "1622398925373-3f91b1e275f5",
  "birthday-gifts": "1623321673989-830eff0fd59f",
};

/** Collection slug → tile and banner image. */
export const COLLECTION_PHOTOS: Record<string, string> = {
  "new-arrivals": "1749125380446-60fd7c5ba4cb",
  "best-sellers": "1694062045776-f48d9b6de57e",
  "trending-now": "1601821765780-754fa98637c1",
  "lightweight": "1611652022419-a9419f74343d",
  "traditional": "1679006831648-7c9ea12e5807",
  "contemporary": "1617038220319-276d3cfab638",
  "bridal": "1654764746221-7bc58ef4dbad",
  "premium": "1744822220368-c380740bfc7f",
  "gifts-for-her": "1623321673989-830eff0fd59f",
  "gifts-for-him": "1612285127323-1837364f9da0",
};

/** Home-page banners (by sort order) and fixed brand imagery. */
export const HERO_PHOTOS = ["1787831398033-d70495c1e8a4", "1633934542430-0905ccb5f050", "1761569105762-c54a69466d06"];
export const EDITORIAL_PHOTOS = ["1744822220368-c380740bfc7f", "1679006831648-7c9ea12e5807", "1620656798579-1984d9e87df7"];
export const BRAND_PHOTOS = {
  bridal: "1751606615009-30f61ff1a510",
  craft: "1772442125267-7640b4b5f2fe",
  consultation: "1779475546066-742c9a580de1",
  menuBestSellers: "1694062045776-f48d9b6de57e",
  menuDiamond: "1743264385411-57c883bdc0ea",
  menuWedding: "1654764746221-7bc58ef4dbad",
  menuBridal: "1617633150878-7df1d12a9a57",
};

export function allPhotoIds() {
  return [...new Set([...Object.values(PRODUCT_PHOTOS).flat(), ...Object.values(CATEGORY_PHOTOS), ...Object.values(COLLECTION_PHOTOS), ...HERO_PHOTOS, ...EDITORIAL_PHOTOS, ...Object.values(BRAND_PHOTOS)])];
}
