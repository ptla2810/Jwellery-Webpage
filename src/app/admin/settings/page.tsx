import { requirePermissionPage } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings";
import { emailConfigured } from "@/lib/email";
import { paymentSimulatorEnabled, razorpayConfig } from "@/lib/env";
import { Card, PageHeader, Pill } from "@/components/admin/ui";
import { AnnouncementForm, ConsultationForm, ShippingForm, StoreForm, TaxForm } from "@/components/admin/SettingsForms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermissionPage("settings.write", "/admin/settings");
  const [store, announcement, shipping, tax, consultation] = await Promise.all([getSetting("store"), getSetting("announcement"), getSetting("shipping"), getSetting("tax"), getSetting("consultation")]);
  const rzp = razorpayConfig();
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <Card title="Integrations status">
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">Razorpay payments {rzp ? <Pill tone="good">configured{rzp.keyId.startsWith("rzp_test_") ? " (test mode)" : ""}</Pill> : <Pill tone="warn">not configured</Pill>}</li>
          <li className="flex items-center justify-between">Razorpay webhook secret {rzp?.webhookSecret ? <Pill tone="good">set</Pill> : <Pill tone="warn">missing</Pill>}</li>
          <li className="flex items-center justify-between">Development payment simulator {paymentSimulatorEnabled() ? <Pill tone="warn">enabled (dev only)</Pill> : <Pill>off</Pill>}</li>
          <li className="flex items-center justify-between">Email (SMTP) {emailConfigured() ? <Pill tone="good">configured</Pill> : <Pill tone="warn">not configured — emails are logged</Pill>}</li>
          <li className="flex items-center justify-between">Image storage <Pill>{process.env.STORAGE_DRIVER === "s3" ? "S3-compatible" : "local disk"}</Pill></li>
        </ul>
        <p className="mt-3 text-xs text-muted">Credentials are set through environment variables, never in the database. See README › Configuration.</p>
      </Card>
      <Card title="Store details"><StoreForm s={store} /></Card>
      <Card title="Announcement bar"><AnnouncementForm s={announcement} /></Card>
      <Card title="Shipping & delivery"><ShippingForm s={shipping} /></Card>
      <Card title="Tax"><TaxForm s={tax} /></Card>
      <Card title="Consultation / store section"><ConsultationForm s={consultation} /></Card>
    </div>
  );
}
