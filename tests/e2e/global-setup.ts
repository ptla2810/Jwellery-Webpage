import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import resetTestDatabase from "../support/global-setup";
import { createAdmin } from "../../scripts/create-admin";

export default async function setup() {
  await resetTestDatabase();
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/aurelle_test?schema=public";
  const db = new PrismaClient({ datasources: { db: { url } } });
  const password = `E2e${randomBytes(6).toString("hex")}7`;
  await createAdmin(db, "e2e-admin@example.com", "E2E Admin", password);
  await db.$disconnect();
  mkdirSync("tests/e2e/.auth", { recursive: true });
  writeFileSync("tests/e2e/.auth/creds.json", JSON.stringify({ email: "e2e-admin@example.com", password }));
}
