import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/aurelle_test?schema=public",
      AUTH_SECRET: "test-secret-test-secret-test-secret-123456",
      DEV_PAYMENT_SIMULATOR: "true",
      RAZORPAY_KEY_ID: "",
      RAZORPAY_KEY_SECRET: "",
      RAZORPAY_WEBHOOK_SECRET: "",
      DISABLE_RATE_LIMIT: "true",
    },
  },
});
