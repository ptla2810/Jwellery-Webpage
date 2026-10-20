import type { OrderStatus } from "@prisma/client";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "PAYMENT_FAILED", "CANCELLED"],
  PAYMENT_FAILED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Transitions an administrator may trigger manually (payment-driven ones happen automatically). */
export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_FAILED: ["CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_FAILED: "Payment failed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const CUSTOMER_TIMELINE: OrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export const PAYMENT_PENDING_MINUTES = 30;
export const RETURN_WINDOW_DAYS = 15;
