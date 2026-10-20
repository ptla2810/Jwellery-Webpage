import "server-only";
import { prisma } from "./db";
import { clientIp } from "./request";

/**
 * Fixed-window rate limiter stored in PostgreSQL so it works across multiple instances.
 * Returns true when the request is allowed.
 */
export async function rateLimit(scope: string, limit: number, windowSeconds: number, identity?: string): Promise<boolean> {
  if (process.env.DISABLE_RATE_LIMIT === "true" && process.env.NODE_ENV !== "production") return true;
  const key = `${scope}:${identity ?? (await clientIp())}`.slice(0, 200);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart") VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."windowStart" < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimitBucket"."windowStart" < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE "RateLimitBucket"."windowStart" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 0) <= limit;
}
