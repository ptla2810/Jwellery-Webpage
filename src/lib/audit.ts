import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { clientIp } from "./request";

export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Prisma.InputJsonValue,
) {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, entityType, entityId, metadata, ip: await clientIp().catch(() => null) },
    });
  } catch (err) {
    console.error("[audit] failed to record", action, (err as Error).message);
  }
}
