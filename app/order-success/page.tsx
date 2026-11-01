import Link from "next/link";
import { Check, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { readReceiptToken } from "@/lib/order-receipt";
import { money } from "@/lib/money";
import { OrderProgress } from "@/components/order-progress";
import { ReceiptActions } from "@/components/receipt-actions";
import { PaymentPanel } from "@/components/payment-panel";
import { upiPaymentUri } from "@/lib/upi";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order | Veloura", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function OrderSuccess({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const id = token ? await readReceiptToken(token) : null;
  let unavailable = false;
  const order = id ? await prisma.order.findUnique({ where: { id } }).catch(() => { unavailable = true; return null; }) : null;
  if (!order) return <main className="page-container"><div className="empty-state">
    <h1>{unavailable ? "Your confirmation is temporarily unavailable." : "We couldn’t open that confirmation."}</h1>
    <p>{unavailable ? "Please refresh this page shortly. Your confirmation link has been preserved." : "Use the confirmation link from your checkout. Links expire after seven days. Sign in to your account to reopen account-linked orders."}</p>
    <Link className="button-dark" href="/account">Your account</Link>{" "}<Link className="button-outline" href="/contact">Contact the studio</Link>
  </div></main>;

  const settings = await prisma.storeSettings.findUnique({ where: { id: "main" }, select: { storeName: true } }).catch(() => null);
  const items = JSON.parse(order.items) as { name: string; quantity: number; price: number }[];
  const intent = order.paymentMethod!=="COD" ? await prisma.paymentIntent.findUnique({where:{id:order.id}}) : null;
  const upiUri=order.paymentMethod==="UPI"&&intent?.payeeVpa&&intent.payeeName?upiPaymentUri({vpa:intent.payeeVpa,name:intent.payeeName,total:order.total,reference:order.orderNumber}):null;
  const upi=upiUri&&intent?.payeeVpa&&intent.payeeName?{uri:upiUri,qr:await QRCode.toDataURL(upiUri,{width:256,margin:2,errorCorrectionLevel:"M"}),vpa:intent.payeeVpa,name:intent.payeeName,reference:intent.upiReference}:undefined;
  const testPayment=Boolean(intent?.method?.startsWith("test:"));
  const cancelled = order.status === "CANCELLED";
  const outstanding = !cancelled && order.paymentStatus === "PENDING";
  const payment = order.paymentStatus === "PAID" ? (testPayment?"Test payment recorded":"Payment recorded") : order.paymentStatus === "REFUNDED" ? "Refund recorded" : cancelled ? "No payment due for this cancelled order" : order.paymentMethod==="COD"?"Pay on delivery":order.paymentMethod==="UPI"&&intent?.upiReference?"UPI reference submitted - verification pending":"Online payment pending";

  return <main className="page-container receipt-page">
    <div className="success-order receipt-heading">
      <div className="success-mark">{cancelled ? <Package size={28} /> : <Check size={28} />}</div>
      <div className="eyebrow">{settings?.storeName ?? "Veloura"} · Your receipt</div>
      <h1>{cancelled ? "Order cancelled." : order.status === "DELIVERED" ? "Delivered with care." : "Order received."}</h1>
      <p>{cancelled ? "This order remains in your records for reference." : "Your order is safely recorded. Revisit this page to see its latest status."}</p>
      <p className="receipt-reference">ORDER REFERENCE · <strong>{order.orderNumber}</strong></p>
      <p>Placed {new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" })} IST</p>
    </div>
    {testPayment&&<p className="admin-error" role="status">Gateway TEST MODE: no real money is collected. This test order must not be dispatched.</p>}
    <OrderProgress status={order.status} />
    <div className="receipt-grid">
      <section className="form-card" aria-label="Order summary">
        <h2>Your selection</h2>
        <div className="receipt-items">
          {items.map((item, index) => <div className="summary-line" key={index}><span>{item.name} × {item.quantity}<small>{money(item.price)} each</small></span><span>{money(item.price * item.quantity)}</span></div>)}
          <div className="summary-line"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
          <div className="summary-line"><span>Delivery</span><span>{order.shipping === 0 ? "Complimentary" : money(order.shipping)}</span></div>
          <div className="summary-line summary-total"><span>Order total</span><strong>{money(order.total)}</strong></div>
        </div>
        <div className="receipt-payment"><strong>{payment}</strong><p>{outstanding ? order.paymentMethod==="COD"?`${money(order.total)} is due on delivery. No online payment was collected at checkout.`:`${money(order.total)} is awaiting payment verification. Payment method: ${order.paymentMethod==="UPI"?"Direct UPI":"Razorpay"}.` : "Payment status reflects the store’s records. Contact the studio with any questions."}</p></div>
        <small>This is an order receipt. It is not a tax invoice.</small>
      </section>
      <section className="form-card receipt-delivery" aria-label="Delivery details">
        <h2>Delivery details</h2>
        <address><strong>{order.customerName}</strong><br />{order.address}<br />{order.city} · {order.postalCode}</address>
        <p>{order.email}<br />{order.phone}</p>
        {order.notes && <><h3>Your delivery note</h3><p className="receipt-note">{order.notes}</p></>}
        <p className="receipt-help">Keep this link private: it includes your order and delivery information. Confirmation links expire after seven days.</p>
      </section>
    </div>
    {cancelled&&!testPayment&&order.paymentStatus==="PAID"&&<p className="admin-error" role="alert">Payment is recorded for a cancelled order. The store must review the payment and arrange any applicable refund; this receipt does not confirm a refund.</p>}
    {outstanding&&order.paymentMethod!=="COD"&&token&&<PaymentPanel token={token} method={order.paymentMethod} orderNumber={order.orderNumber} upi={upi}/>}
    <ReceiptActions orderNumber={order.orderNumber} />
    <div className="receipt-next"><Link href="/account" className="button-outline">Your account & orders</Link><Link href="/products" className="button-dark">Continue exploring</Link></div>
  </main>;
}
