import { vi } from "vitest";

/** In-memory stand-in for next/headers so server code (sessions, guest carts) can run in tests. */
export const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
  headers: async () => new Headers({ "user-agent": "vitest", "x-forwarded-for": "127.0.0.1" }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT:${url}`), { digest: `NEXT_REDIRECT;${url}` });
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
