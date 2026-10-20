import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/**
 * Prepares the dedicated test database: applies migrations, empties every table and re-seeds the demo catalogue.
 * Refuses to touch any database whose name does not contain "test".
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/aurelle_test?schema=public";
  const dbName = new URL(url).pathname.slice(1);
  if (!/test/i.test(dbName)) throw new Error(`Refusing to reset database "${dbName}" (name must contain "test")`);
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  const db = new PrismaClient({ datasources: { db: { url } } });
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await db.$disconnect();
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
}
