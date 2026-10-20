/**
 * Downloads the demo catalogue photography listed in src/lib/photos.ts into public/images/photos.
 * Existing files are kept, so this is safe to re-run. Usage: npm run photos:fetch
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { allPhotoIds } from "../src/lib/photos";

const DIR = path.join(process.cwd(), "public/images/photos");

async function main() {
  mkdirSync(DIR, { recursive: true });
  const ids = allPhotoIds().filter((id) => !existsSync(path.join(DIR, `${id}.jpg`)));
  let failed = 0;
  for (const id of ids) {
    const res = await fetch(`https://images.unsplash.com/photo-${id}?w=1200&q=72&fm=jpg&fit=max`);
    if (!res.ok) {
      console.error(`✗ ${id}: HTTP ${res.status}`);
      failed++;
      continue;
    }
    writeFileSync(path.join(DIR, `${id}.jpg`), Buffer.from(await res.arrayBuffer()));
    console.log(`✓ ${id}`);
  }
  console.log(`${ids.length - failed} downloaded, ${failed} failed, ${allPhotoIds().length - ids.length} already present.`);
  if (failed) process.exit(1);
}

main();
