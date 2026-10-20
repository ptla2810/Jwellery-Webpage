"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import { addToCartAction, getCartAction } from "@/app/actions/cart";
import { toggleWishlistAction } from "@/app/actions/wishlist";
import type { CartView } from "@/lib/cart";
import { useToast } from "./ToastProvider";

type StoreState = {
  cartCount: number;
  cart: CartView | null;
  setCart: (c: CartView) => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToCart: (variantId: string, qty?: number, opts?: { openDrawer?: boolean }) => Promise<boolean>;
  adding: boolean;
  wishlist: Set<string>;
  toggleWishlist: (productId: string) => Promise<void>;
  setWishlist: (ids: string[]) => void;
  user: { name: string; isStaff: boolean } | null;
};

const Ctx = createContext<StoreState | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

export function StoreProvider({
  children,
  initialCount,
  initialWishlist,
  user,
}: {
  children: ReactNode;
  initialCount: number;
  initialWishlist: string[];
  user: StoreState["user"];
}) {
  const toast = useToast();
  const [cart, setCartState] = useState<CartView | null>(null);
  const [count, setCount] = useState(initialCount);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wishlist, setWl] = useState(() => new Set(initialWishlist));
  const [adding, startAdding] = useTransition();

  const setCart = useCallback((c: CartView) => {
    setCartState(c);
    setCount(c.count);
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    getCartAction().then(setCart).catch(() => {});
  }, [setCart]);

  const addToCart = useCallback(
    (variantId: string, qty = 1, opts: { openDrawer?: boolean } = { openDrawer: true }) =>
      new Promise<boolean>((resolve) => {
        startAdding(async () => {
          const res = await addToCartAction(variantId, qty);
          if (res.cart) setCart(res.cart);
          if (res.ok) {
            toast(res.message ?? "Added to your bag");
            if (opts.openDrawer) setDrawerOpen(true);
          } else toast(res.error, "error");
          resolve(res.ok);
        });
      }),
    [setCart, toast],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const wasSaved = wishlist.has(productId);
      setWl((s) => {
        const n = new Set(s);
        if (wasSaved) n.delete(productId);
        else n.add(productId);
        return n;
      });
      const res = await toggleWishlistAction(productId);
      if (res.ok) {
        setWl(new Set(res.ids));
        toast(res.saved ? "Saved to your wishlist" : "Removed from your wishlist");
      } else {
        setWl((s) => {
          const n = new Set(s);
          if (wasSaved) n.add(productId);
          else n.delete(productId);
          return n;
        });
        toast(res.error, "error");
      }
    },
    [wishlist, toast],
  );

  const value = useMemo<StoreState>(
    () => ({
      cartCount: count,
      cart,
      setCart,
      drawerOpen,
      openDrawer,
      closeDrawer: () => setDrawerOpen(false),
      addToCart,
      adding,
      wishlist,
      toggleWishlist,
      setWishlist: (ids) => setWl(new Set(ids)),
      user,
    }),
    [count, cart, setCart, drawerOpen, openDrawer, addToCart, adding, wishlist, toggleWishlist, user],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
