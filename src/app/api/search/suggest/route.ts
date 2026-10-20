import { NextResponse } from "next/server";
import { suggest } from "@/lib/catalog/queries";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  if (!(await rateLimit("suggest", 90, 60))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json(await suggest(q), { headers: { "Cache-Control": "private, max-age=30" } });
}
