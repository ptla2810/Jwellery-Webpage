import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { razorpayConfig } from "@/lib/env";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { recordPaymentCaptured, recordPaymentFailed } from "@/lib/orders/service";

export const dynamic = "force-dynamic";

type RzpEvent = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; amount: number; status: string; method?: string; error_code?: string; error_description?: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
  };
};

export async function POST(req: Request) {
  const cfg = razorpayConfig();
  if (!cfg?.webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature, cfg.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as RzpEvent;
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${event.event}:${event.payload.payment?.entity.id ?? event.payload.refund?.entity.id ?? ""}`;

  try {
    await prisma.paymentWebhookEvent.create({ data: { provider: "razorpay", eventId, event: event.event } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ status: "duplicate" });
    }
    throw err;
  }

  try {
    const p = event.payload.payment?.entity;
    if ((event.event === "payment.captured" || event.event === "order.paid") && p?.order_id) {
      await recordPaymentCaptured({ providerOrderId: p.order_id, providerPaymentId: p.id, amount: p.amount, method: p.method ?? null });
    } else if (event.event === "payment.failed" && p?.order_id) {
      await recordPaymentFailed({ providerOrderId: p.order_id, providerPaymentId: p.id, code: p.error_code, reason: p.error_description });
    } else if (event.event.startsWith("refund.") && event.payload.refund) {
      const r = event.payload.refund.entity;
      const payment = await prisma.payment.findUnique({ where: { providerPaymentId: r.payment_id } });
      if (payment) {
        const status = event.event === "refund.processed" ? "COMPLETED" : event.event === "refund.failed" ? "FAILED" : "PROCESSING";
        const existing = await prisma.refund.findFirst({ where: { OR: [{ providerRefundId: r.id }, { paymentId: payment.id, providerRefundId: null }] } });
        if (existing) await prisma.refund.update({ where: { id: existing.id }, data: { status, providerRefundId: r.id } });
      }
    }
  } catch (err) {
    // Allow Razorpay to retry: remove the dedupe marker so the next delivery is processed.
    await prisma.paymentWebhookEvent.deleteMany({ where: { provider: "razorpay", eventId } });
    console.error("[razorpay webhook] processing failed", (err as Error).message);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  return NextResponse.json({ status: "ok" });
}
