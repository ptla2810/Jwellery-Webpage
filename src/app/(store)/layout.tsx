import { getNavigation } from "@/lib/catalog/queries";
import { getSetting } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { cartCount } from "@/lib/cart";
import { wishlistProductIds } from "@/lib/wishlist";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { HeaderClient } from "@/components/layout/HeaderClient";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [nav, store, announcement, user, count, wishlist] = await Promise.all([
    getNavigation(),
    getSetting("store"),
    getSetting("announcement"),
    getCurrentUser(),
    cartCount(),
    wishlistProductIds(),
  ]);
  return (
    <StoreProvider
      initialCount={count}
      initialWishlist={wishlist}
      user={user ? { name: user.name, isStaff: user.permissions.has("admin.access") } : null}
    >
      {announcement.isActive && <AnnouncementBar messages={announcement.messages} />}
      <HeaderClient nav={nav} storeName={store.name} />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
    </StoreProvider>
  );
}
