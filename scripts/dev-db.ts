/**
 * Runs a real local PostgreSQL server (via the embedded-postgres binaries) for development.
 * Production deployments should point DATABASE_URL at a managed PostgreSQL instance instead.
 *
 * Usage: npm run db:start   (keep this terminal open)
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const port = Number(process.env.DEV_DB_PORT ?? 5433);
const dataDir = path.resolve(process.env.DEV_DB_DIR ?? ".pgdata");
const databases = (process.env.DEV_DB_NAMES ?? "aurelle,aurelle_test").split(",");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: true,
    onLog: () => {},
  });

  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log(`Initialising PostgreSQL data directory at ${dataDir}`);
    await pg.initialise();
  }
  await pg.start();
  for (const name of databases) {
    try {
      await pg.createDatabase(name);
      console.log(`Created database "${name}"`);
    } catch {
      // already exists
    }
  }
  console.log(`PostgreSQL running on postgresql://postgres:postgres@localhost:${port} (Ctrl+C to stop)`);

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
