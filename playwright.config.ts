import { defineConfig, devices } from "@playwright/test";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/aurelle_test?schema=public";
const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * End-to-end tests run against a production build (`npm run build` first) served on a separate port
 * and the dedicated test database, which global setup resets and seeds.
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: TEST_DB, NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456789", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "" },
  },
});
