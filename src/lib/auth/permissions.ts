export const PERMISSIONS = {
  "admin.access": "Access admin dashboard",
  "products.read": "View products & inventory",
  "products.write": "Create and edit products",
  "inventory.write": "Adjust inventory",
  "catalog.write": "Manage categories & collections",
  "orders.read": "View orders",
  "orders.write": "Update orders, shipments & returns",
  "refunds.write": "Record refunds",
  "customers.read": "View customers",
  "marketing.write": "Manage coupons, banners & promotions",
  "reviews.write": "Moderate reviews",
  "support.write": "Handle support requests",
  "content.write": "Edit policy pages",
  "settings.write": "Edit store settings",
  "staff.write": "Manage staff & roles",
  "audit.read": "View audit log",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ROLE_PRESETS: Record<string, { name: string; permissions: PermissionKey[] }> = {
  customer: { name: "Customer", permissions: [] },
  staff: {
    name: "Staff",
    permissions: [
      "admin.access",
      "products.read",
      "inventory.write",
      "orders.read",
      "orders.write",
      "customers.read",
      "reviews.write",
      "support.write",
    ],
  },
  admin: { name: "Administrator", permissions: Object.keys(PERMISSIONS) as PermissionKey[] },
};
