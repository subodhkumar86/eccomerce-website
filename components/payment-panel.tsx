"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/api-response";

type CheckoutResult = { razorpay_payment_id: string; razorpay_signature: string };
type GatewayOptions = { key: string; order_id: string; amount: number; currency: string; name: string; description: string; prefill: { name: string; email: string; contact: string }; handler: (data: CheckoutResult) => void; modal: { ondismiss: () => void } };
type Gateway = { open: () => void; on: (event: string, callback: () => void) => void };
declare global { interface Window { Razorpay?: new (options: GatewayOptions) => Gateway } }

let gatewayScript: Promise<void> | undefined;
function loadGateway() {
  if (window.Razorpay) return Promise.resolve();
  if (!gatewayScript) gatewayScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true;
    const timer = setTimeout(() => { script.remove(); gatewayScript = undefined; reject(new Error("Payment window did not load. Please try again.")); }, 15000);
    script.onload = () => { clearTimeout(timer); if (window.Razorpay) resolve(); else { gatewayScript = undefined; reject(new Error("Payment window is unavailable.")); } };
    script.onerror = () => { clearTimeout(timer); script.remove(); gatewayScript = undefined; reject(new Error("Could not load the payment window. Please retry.")); };
    document.body.appendChild(script);
  });
  return gatewayScript;
}

export function PaymentPanel({ token, method, upi, orderNumber }: { token: string; method: string; orderNumber: string; upi?: { uri: string; qr: string; vpa: string; name: string; reference: string | null } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [reference, setReference] = useState(upi?.reference ?? "");
  async function gatewayRequest(body: object) { return readApiResponse<{ paymentStatus: string }>(await fetch("/api/payments/razorpay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }) }), "Unable to verify payment."); }
  async function refresh() {
    setBusy(true); setError(""); setNotice("");
    try { const result = await gatewayRequest({ action: "refresh" }); setNotice(result.paymentStatus === "PENDING" ? "No captured payment has been confirmed yet. If your bank debited you, do not pay again; refresh shortly." : "Payment status verified."); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Please retry."); } finally { setBusy(false); }
  }
  async function pay() {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    try {
      const config = await readApiResponse<{ key: string; orderId: string; amount: number; currency: string; customer: { name: string; email: string; contact: string }; testMode: boolean }>(await fetch("/api/payments/razorpay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "start" }) }), "Unable to start payment.");
      await loadGateway();
      const gateway = new window.Razorpay!({ key: config.key, order_id: config.orderId, amount: config.amount, currency: config.currency, name: config.testMode ? "Store · TEST PAYMENT" : "Store checkout", description: orderNumber, prefill: config.customer,
        handler: async result => {
          try { const verified = await gatewayRequest({ action: "verify", paymentId: result.razorpay_payment_id, signature: result.razorpay_signature }); setNotice(verified.paymentStatus === "PAID" ? "Payment verified." : "Payment status updated."); router.refresh(); }
          catch (cause) { setError(cause instanceof Error ? cause.message : "Verification is pending. Refresh before paying again."); } finally { setBusy(false); }
        }, modal: { ondismiss: () => { setBusy(false); setNotice("Payment window closed. Your order is saved and remains unpaid until verification. If debited, refresh the payment status before retrying."); } },
      });
      gateway.on("payment.failed", () => { setBusy(false); setError("The payment attempt did not complete. Check your bank/app before retrying."); });
      gateway.open();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to start payment."); setBusy(false); }
  }
  async function submitReference(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await readApiResponse(await fetch("/api/payments/upi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, reference }) }), "Unable to save the reference."); setNotice("Reference saved. Awaiting the store's bank verification; this is not a payment confirmation."); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Please retry."); } finally { setBusy(false); }
  }

  return <section className="form-card payment-panel" aria-label="Complete payment"><h2>{method === "UPI" ? "Pay with UPI" : "Complete online payment"}</h2>
    {upi ? <div className="upi-payment-grid"><img className="upi-qr" src={upi.qr} alt={`UPI payment QR for order ${orderNumber}`} width={240} height={240} /><div><p>Payee: <strong>{upi.name}</strong><br /><span className="upi-address">{upi.vpa}</span></p><a className="button-dark" href={upi.uri}>Open UPI app</a><p>Scan using your UPI app. Check the payee and amount before confirming. Pay only once.</p><button type="button" className="button-outline" onClick={async () => { try { await navigator.clipboard.writeText(upi.vpa); setNotice("UPI ID copied."); } catch { setNotice("Copy the UPI ID shown above."); } }}>Copy UPI ID</button><form onSubmit={submitReference}><div className="field"><label htmlFor="upi-reference">UPI transaction reference / UTR</label><input id="upi-reference" value={reference} onChange={event => setReference(event.target.value)} required minLength={6} maxLength={80} pattern="[A-Za-z0-9 -]{6,80}" autoComplete="off" disabled={busy} /></div><button className="button-dark" disabled={busy}>{busy ? "Saving..." : "Submit payment reference"}</button></form><p className="payment-disclosure">A QR scan or submitted reference does not verify receipt of money. The store will check its bank record before confirming payment.</p></div></div> : <><p>Continue to Razorpay to choose an enabled UPI, card, netbanking or wallet method. No card, UPI PIN or OTP is collected by this store.</p><div className="receipt-actions"><button className="button-dark" disabled={busy} onClick={pay}>{busy ? "Processing..." : "Pay securely"}</button><button className="button-outline" disabled={busy} onClick={refresh}>Check payment status</button></div></>}
    {error && <p role="alert" className="admin-error">{error}</p>}{notice && <p role="status" className="payment-disclosure">{notice}</p>}
  </section>;
}
