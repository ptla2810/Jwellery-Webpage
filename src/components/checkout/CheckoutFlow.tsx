"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, CreditCard, FlaskConical, Lock, Pencil, Truck, Wallet } from "lucide-react";
import {
  checkoutQuoteAction,
  placeOrderAction,
  retryPaymentAction,
  simulatePaymentAction,
  type QuoteResult,
} from "@/app/actions/checkout";
import type { CartView } from "@/lib/cart";
import type { PaymentInit } from "@/lib/orders/service";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormMessage, Input, Select, Textarea } from "@/components/ui/Field";
import { ProductImage } from "@/components/ui/ProductImage";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { useStore } from "@/components/providers/StoreProvider";
import { cn } from "@/lib/cn";
import { openRazorpayCheckout } from "./razorpay";

type Address = { fullName: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; postalCode: string };
type SavedAddress = Address & { id: string; isDefault: boolean };
type Method = "RAZORPAY" | "COD" | "TEST_SIMULATOR";

const STEPS = ["Contact", "Address", "Delivery", "Review", "Payment"] as const;
const emptyAddress: Address = { fullName: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", postalCode: "" };

export function CheckoutFlow({
  cart,
  checkoutToken,
  user,
  savedAddresses,
  states,
  storeName,
}: {
  cart: CartView;
  checkoutToken: string;
  user: { name: string; email: string; phone: string | null } | null;
  savedAddresses: SavedAddress[];
  states: readonly string[];
  storeName: string;
}) {
  const router = useRouter();
  const { setCart } = useStore();
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
  const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [addressId, setAddressId] = useState<string | "new">(defaultAddr?.id ?? "new");
  const [address, setAddress] = useState<Address>(defaultAddr ?? { ...emptyAddress, fullName: user?.name ?? "", phone: user?.phone ?? "" });
  const [saveAddress, setSaveAddress] = useState(true);
  const [delivery, setDelivery] = useState<"standard" | "express">("standard");
  const [method, setMethod] = useState<Method | null>(null);
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<Extract<QuoteResult, { ok: true }> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [placed, setPlaced] = useState<{ orderNumber: string; payment: PaymentInit; prefill: { name: string; email: string; contact: string } } | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const refreshQuote = useCallback(
    (postalCode: string, d: "standard" | "express", m: Method | null) =>
      new Promise<boolean>((resolve) =>
        start(async () => {
          const r = await checkoutQuoteAction({ postalCode, deliveryOption: d, paymentMethod: m ?? undefined });
          if (r.ok) {
            setQuote(r);
            setFormError(null);
            resolve(true);
          } else {
            setFormError(r.error);
            resolve(false);
          }
        }),
      ),
    [],
  );

  useEffect(() => {
    if (step >= 2 && address.postalCode.length === 6) refreshQuote(address.postalCode, delivery, method);
  }, [delivery, method]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateContact = () => {
    const e: Record<string, string> = {};
    if (contact.name.trim().length < 2) e["contact.name"] = "Enter your name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email.trim())) e["contact.email"] = "Enter a valid email address";
    if (!/^(\+91|0)?[6-9]\d{9}$/.test(contact.phone.replace(/[\s-]/g, ""))) e["contact.phone"] = "Enter a valid 10-digit mobile number";
    setErrors(e);
    return !Object.keys(e).length;
  };
  const validateAddress = () => {
    const e: Record<string, string> = {};
    if (address.fullName.trim().length < 2) e["address.fullName"] = "Enter the recipient's name";
    if (!/^(\+91|0)?[6-9]\d{9}$/.test(address.phone.replace(/[\s-]/g, ""))) e["address.phone"] = "Enter a valid 10-digit mobile number";
    if (address.line1.trim().length < 5) e["address.line1"] = "Enter house/flat number and street";
    if (address.city.trim().length < 2) e["address.city"] = "Enter city";
    if (!address.state) e["address.state"] = "Select a state";
    if (!/^[1-9][0-9]{5}$/.test(address.postalCode)) e["address.postalCode"] = "Enter a valid 6-digit PIN code";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = async () => {
    setFormError(null);
    if (step === 0 && !validateContact()) return;
    if (step === 1) {
      if (!validateAddress()) return;
      if (!(await refreshQuote(address.postalCode, delivery, method))) return;
    }
    if (step === 3 && quote?.hasIssues) {
      setFormError("Some items in your bag are no longer available. Please review your bag.");
      return;
    }
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openPayment = async (orderNumber: string, payment: PaymentInit, prefill: { name: string; email: string; contact: string }) => {
    setPaymentMessage(null);
    if (payment.kind === "none") {
      router.push(`/order/${orderNumber}?placed=1`);
      return;
    }
    if (payment.kind === "simulator") return; // simulator panel is rendered below
    await openRazorpayCheckout({
      keyId: payment.keyId,
      providerOrderId: payment.providerOrderId,
      amount: payment.amount,
      orderNumber,
      storeName,
      prefill,
      onVerified: () => router.push(`/order/${orderNumber}?placed=1`),
      onMessage: setPaymentMessage,
    });
  };

  const place = () => {
    if (!method) {
      setFormError("Please choose a payment method");
      return;
    }
    start(async () => {
      const res = await placeOrderAction(
        { checkoutToken, contact, address, deliveryOption: delivery, paymentMethod: method, customerNote: note },
        !!user && addressId === "new" && saveAddress,
      );
      if (!res.ok) {
        setFormError(res.error);
        if (res.fieldErrors) setErrors(res.fieldErrors);
        return;
      }
      setPlaced(res);
      if (method === "COD") setCart({ ...cart, lines: [], count: 0 });
      await openPayment(res.orderNumber, res.payment, res.prefill);
    });
  };

  const retry = () =>
    start(async () => {
      if (!placed) return;
      const r = await retryPaymentAction(placed.orderNumber);
      if (!r.ok) setPaymentMessage(r.error);
      else {
        setPlaced({ ...placed, payment: r.payment });
        await openPayment(placed.orderNumber, r.payment, placed.prefill);
      }
    });

  const simulate = (outcome: "success" | "failure") =>
    start(async () => {
      if (!placed || placed.payment.kind !== "simulator") return;
      const r = await simulatePaymentAction({ orderNumber: placed.orderNumber, providerOrderId: placed.payment.providerOrderId, outcome });
      if (r.ok) router.push(`/order/${placed.orderNumber}?placed=1`);
      else setPaymentMessage(r.error ?? "Payment failed");
    });

  const fe = (k: string) => errors[k];
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <div>
        <ol className="mb-8 flex items-center gap-2 overflow-x-auto text-xs" aria-label="Checkout progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex shrink-0 items-center gap-2">
              <span className={cn("flex size-6 items-center justify-center rounded-full border text-[0.65rem] font-semibold", i < step ? "border-ink bg-ink text-ivory" : i === step ? "border-gold text-gold" : "border-line text-muted")} aria-current={i === step ? "step" : undefined}>
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cn("uppercase tracking-[0.12em]", i === step ? "font-semibold text-ink" : "text-muted")}>{s}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden />}
            </li>
          ))}
        </ol>

        {step > 0 && (
          <StepSummary label="Contact" editable={!placed} onEdit={() => setStep(0)}>
            <p>{contact.name} · {contact.email} · {contact.phone}</p>
          </StepSummary>
        )}
        {step > 1 && (
          <StepSummary label="Ship to" editable={!placed} onEdit={() => setStep(1)}>
            <p>{address.fullName}, {address.line1}{address.line2 && `, ${address.line2}`}, {address.city}, {address.state} {address.postalCode}</p>
          </StepSummary>
        )}
        {step > 2 && quote && (
          <StepSummary label="Delivery" editable={!placed} onEdit={() => setStep(2)}>
            <p>{delivery === "express" ? `Express · ${quote.delivery.express}` : `Standard · ${quote.delivery.standard}`}</p>
          </StepSummary>
        )}

        <div className="pt-6">
          {step === 0 && (
            <section aria-labelledby="s-contact" className="space-y-5">
              <h2 id="s-contact" className="text-3xl">Contact information</h2>
              {!user && (
                <p className="text-sm text-muted">
                  Have an account? <Link href="/login?next=/checkout" className="font-semibold text-gold underline">Sign in</Link> for faster checkout — or continue as a guest.
                </p>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Input name="contact.name" label="Full name" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} error={fe("contact.name")} required className="sm:col-span-2" />
                <Input name="contact.email" type="email" label="Email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} error={fe("contact.email")} required readOnly={!!user} hint={user ? "Signed-in email" : "We'll send your order confirmation here"} />
                <Input name="contact.phone" type="tel" label="Mobile number" autoComplete="tel" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} error={fe("contact.phone")} required />
              </div>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="s-address" className="space-y-5">
              <h2 id="s-address" className="text-3xl">Shipping address</h2>
              {savedAddresses.length > 0 && (
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="sr-only">Saved addresses</legend>
                  {savedAddresses.map((a) => (
                    <label key={a.id} className={cn("cursor-pointer border bg-white p-4 text-sm", addressId === a.id ? "border-ink" : "border-line")}>
                      <input type="radio" name="savedAddress" className="sr-only" checked={addressId === a.id} onChange={() => { setAddressId(a.id); setAddress(a); }} />
                      <p className="font-semibold">{a.fullName}</p>
                      <p className="text-muted">{a.line1}, {a.city}, {a.state} {a.postalCode}</p>
                      <p className="text-muted">{a.phone}</p>
                    </label>
                  ))}
                  <label className={cn("flex cursor-pointer items-center justify-center border border-dashed bg-white p-4 text-sm", addressId === "new" ? "border-ink" : "border-line")}>
                    <input type="radio" name="savedAddress" className="sr-only" checked={addressId === "new"} onChange={() => { setAddressId("new"); setAddress({ ...emptyAddress, fullName: contact.name, phone: contact.phone }); }} />
                    + Add a new address
                  </label>
                </fieldset>
              )}
              {(addressId === "new" || savedAddresses.length === 0) && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input name="address.fullName" label="Recipient name" autoComplete="shipping name" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} error={fe("address.fullName")} required />
                  <Input name="address.phone" label="Recipient mobile" type="tel" autoComplete="shipping tel" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} error={fe("address.phone")} required />
                  <Input name="address.line1" label="Flat / house no., building, street" autoComplete="shipping address-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} error={fe("address.line1")} required className="sm:col-span-2" />
                  <Input name="address.line2" label="Area / locality (optional)" autoComplete="shipping address-line2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} className="sm:col-span-2" />
                  <Input name="address.landmark" label="Landmark (optional)" value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} />
                  <Input name="address.postalCode" label="PIN code" inputMode="numeric" maxLength={6} autoComplete="shipping postal-code" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value.replace(/\D/g, "") })} error={fe("address.postalCode")} required />
                  <Input name="address.city" label="City" autoComplete="shipping address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} error={fe("address.city")} required />
                  <Select name="address.state" label="State" placeholder="Select state" options={states.map((s) => ({ value: s, label: s }))} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} error={fe("address.state")} required />
                  {user && <Checkbox name="saveAddress" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} label="Save this address to my account" className="sm:col-span-2" />}
                </div>
              )}
            </section>
          )}

          {step === 2 && quote && (
            <section aria-labelledby="s-delivery" className="space-y-4">
              <h2 id="s-delivery" className="text-3xl">Delivery option</h2>
              {(["standard", "express"] as const).map((d) => {
                const available = d === "standard" || !!quote.delivery.express;
                return (
                  <label key={d} className={cn("flex cursor-pointer items-center gap-4 border bg-white p-5", delivery === d ? "border-ink" : "border-line", !available && "cursor-not-allowed opacity-50")}>
                    <input type="radio" name="delivery" value={d} checked={delivery === d} disabled={!available} onChange={() => setDelivery(d)} className="size-4 accent-[var(--color-gold)]" />
                    <Truck className="size-5 text-gold" />
                    <span className="flex-1">
                      <span className="block font-semibold capitalize">{d} delivery</span>
                      <span className="block text-sm text-muted">{d === "standard" ? `Estimated ${quote.delivery.standard}` : available ? `Estimated ${quote.delivery.express}` : "Not available for this PIN code"}</span>
                    </span>
                    <span className="text-sm">{d === "express" ? "+ express fee" : "As per bag total"}</span>
                  </label>
                );
              })}
              <p className="text-xs text-muted">Delivery dates are estimates and depend on courier serviceability.</p>
            </section>
          )}

          {step === 3 && quote && (
            <section aria-labelledby="s-review" className="space-y-5">
              <h2 id="s-review" className="text-3xl">Review your order</h2>
              <ul className="divide-y divide-line border-y border-line">
                {cart.lines.map((l) => (
                  <li key={l.id} className="flex items-center gap-4 py-4">
                    <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-cream">{l.image && <ProductImage src={l.image.url} alt="" fill sizes="64px" className="object-cover" />}</span>
                    <span className="flex-1 text-sm">
                      <span className="block font-display text-lg">{l.name}</span>
                      <span className="text-muted">{l.metal}{l.variantName !== "Standard" && ` · ${l.variantName}`} · Qty {l.quantity}</span>
                      {l.issue && <span className="block text-danger">{l.issue}</span>}
                    </span>
                    <span className="text-sm font-semibold">{formatINR(l.unitPrice * l.quantity)}</span>
                  </li>
                ))}
              </ul>
              <Textarea name="note" label="Order note (optional)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Gift message or delivery instructions" />
            </section>
          )}

          {step === 4 && quote && (
            <section aria-labelledby="s-payment" className="space-y-4">
              <h2 id="s-payment" className="text-3xl">Payment</h2>
              {!placed ? (
                <>
                  {!quote.methods.razorpay && !quote.methods.simulator && !(quote.methods.cod && quote.delivery.codAvailable) && (
                    <FormMessage error="No payment method is currently available. Please contact customer care." />
                  )}
                  {quote.methods.razorpay && (
                    <PayOption checked={method === "RAZORPAY"} onSelect={() => setMethod("RAZORPAY")} icon={<CreditCard className="size-5 text-gold" />} title="Pay online" body="UPI, cards, net banking and wallets via Razorpay" />
                  )}
                  {quote.methods.simulator && (
                    <PayOption checked={method === "TEST_SIMULATOR"} onSelect={() => setMethod("TEST_SIMULATOR")} icon={<FlaskConical className="size-5 text-wine" />} title="Test payment (development only)" body="Razorpay keys are not configured. Simulate a successful or failed payment — no money is charged." testId="pay-simulator" />
                  )}
                  {quote.methods.cod && quote.delivery.codAvailable && (
                    <PayOption checked={method === "COD"} onSelect={() => setMethod("COD")} icon={<Wallet className="size-5 text-gold" />} title="Cash on delivery" body="Pay in cash or UPI when your order arrives" testId="pay-cod" />
                  )}
                  {!quote.methods.cod && quote.methods.codMaxOrderValue > 0 && <p className="text-xs text-muted">Cash on delivery is available for orders up to {formatINR(quote.methods.codMaxOrderValue)}.</p>}
                </>
              ) : (
                <div className="space-y-4 border border-line bg-white p-6" data-testid="payment-panel">
                  <p className="text-sm">Order <strong>{placed.orderNumber}</strong> has been created and your items are reserved for 30 minutes.</p>
                  {placed.payment.kind === "simulator" && (
                    <div className="space-y-3 border border-dashed border-wine/40 bg-wine/5 p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-wine"><FlaskConical className="size-4" /> Test mode — simulated gateway</p>
                      <p className="text-sm text-muted">Amount: {formatINR(placed.payment.amount)}. This simulator exists only in development builds.</p>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={() => simulate("success")} loading={pending} data-testid="simulate-success">Simulate successful payment</Button>
                        <Button variant="outline" onClick={() => simulate("failure")} disabled={pending} data-testid="simulate-failure">Simulate failure</Button>
                      </div>
                    </div>
                  )}
                  {placed.payment.kind === "razorpay" && <Button onClick={retry} loading={pending}>Pay {formatINR(placed.payment.amount)}</Button>}
                  <FormMessage error={paymentMessage} />
                  <p className="text-xs text-muted">You can also view this order and retry payment from <Link href={`/order/${placed.orderNumber}`} className="underline">the order page</Link>.</p>
                </div>
              )}
            </section>
          )}

          <div className="mt-6 space-y-4">
            <FormMessage error={formError} />
            {!placed && (
              <div className="flex flex-wrap items-center gap-3">
                {step > 0 && <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={pending}>Back</Button>}
                {step < 4 ? (
                  <Button size="lg" onClick={next} loading={pending} data-testid="checkout-continue">Continue</Button>
                ) : (
                  <Button size="lg" onClick={place} loading={pending} disabled={!method} data-testid="place-order">
                    <Lock className="size-4" /> {method === "COD" ? "Place order" : `Place order & pay`} {quote && formatINR(quote.quote.total)}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="h-fit border border-line bg-white p-6 lg:sticky lg:top-28" aria-label="Order summary">
        <h2 className="mb-4 font-display text-2xl">Summary</h2>
        <ul className="mb-5 space-y-3">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 text-sm">
              <span className="relative h-14 w-12 shrink-0 overflow-hidden bg-cream">{l.image && <ProductImage src={l.image.url} alt="" fill sizes="48px" className="object-cover" />}</span>
              <span className="flex-1 truncate">{l.name} <span className="text-muted">× {l.quantity}</span></span>
              <span>{formatINR(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <OrderSummary quote={quote?.quote ?? cart.quote} showShippingNote={false} />
        {!quote && <p className="mt-3 text-xs text-muted">Shipping is calculated after you enter your address.</p>}
      </aside>
    </div>
  );
}

function StepSummary({ label, onEdit, editable, children }: { label: string; onEdit: () => void; editable: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-4 text-sm">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
        {children}
      </div>
      {editable && (
        <button onClick={onEdit} className="flex items-center gap-1 text-xs text-gold hover:underline"><Pencil className="size-3" /> Edit</button>
      )}
    </div>
  );
}

function PayOption({ checked, onSelect, icon, title, body, testId }: { checked: boolean; onSelect: () => void; icon: React.ReactNode; title: string; body: string; testId?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-4 border bg-white p-5", checked ? "border-ink" : "border-line")} data-testid={testId}>
      <input type="radio" name="payment" checked={checked} onChange={onSelect} className="size-4 accent-[var(--color-gold)]" />
      {icon}
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
    </label>
  );
}
