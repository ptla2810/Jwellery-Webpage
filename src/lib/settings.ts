import "server-only";
import { prisma } from "./db";
import { settingDefaults, settingSchemas, type SettingKey } from "./settings-defaults";

export * from "./settings-defaults";

type SettingValue<K extends SettingKey> = (typeof settingDefaults)[K];

let cache: { at: number; values: Map<string, unknown> } | null = null;
const TTL_MS = 30_000;

export function invalidateSettingsCache() {
  cache = null;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const rows = await prisma.storeSetting.findMany();
    cache = { at: Date.now(), values: new Map(rows.map((r) => [r.key, r.value])) };
  }
  const raw = cache.values.get(key);
  const parsed = settingSchemas[key].safeParse(raw);
  if (parsed.success) return parsed.data as SettingValue<K>;
  return settingDefaults[key];
}

export async function saveSetting<K extends SettingKey>(key: K, value: unknown) {
  const parsed = settingSchemas[key].parse(value);
  await prisma.storeSetting.upsert({
    where: { key },
    create: { key, value: parsed as object },
    update: { value: parsed as object },
  });
  invalidateSettingsCache();
  return parsed;
}
