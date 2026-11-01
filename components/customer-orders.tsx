"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BuyAgain } from "@/components/buy-again";
import { readApiResponse } from "@/lib/api-response";
import { money } from "@/lib/money";
import { orderStatuses } from "@/lib/order-workflow";

type Order = { orderNumber: string; status: string; paymentStatus: string; canCancel: boolean; total: number; createdAt: string; receiptToken: string; items: { productId?: string; name: string; quantity: number }[] };
type History = { orders: Order[]; total: number; page: number; pages: number; pageSize: number };
const labels: Record<string, string> = { NEW: "Received", CONFIRMED: "Confirmed", PROCESSING: "Preparing", SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled" };

export function CustomerOrders() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState({ q: "", status: "", page: 1 });
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  async function cancelOrder(order: Order) {
    if (cancelling || !window.confirm(`Cancel cash-on-delivery order ${order.orderNumber}? This cannot be undone.`)) return;
    setCancelling(order.orderNumber); setActionError(""); setNotice("");
    try {
      const response = await fetch("/api/customer/orders/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: order.orderNumber }) });
      if (response.status === 401) { window.location.replace("/login"); return; }
      await readApiResponse(response, "Unable to cancel this order.");
      setNotice("Order cancelled. Reserved stock has been released.");
      setRetry(value => value + 1);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setCancelling(null); }
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    (async () => {
      try {
        const params = new URLSearchParams({ q: query.q, status: query.status, page: String(query.page) });
        const response = await fetch(`/api/customer/orders?${params}`, { signal: controller.signal, cache: "no-store" });
        if (response.status === 401) { window.location.replace("/login"); return; }
        const data = await readApiResponse<History>(response, "Unable to load orders.");
        if (!controller.signal.aborted) setHistory(data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Please try again.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [query, retry]);

  const filtered = Boolean(query.q || query.status);
  function reset() { setSearch(""); setStatus(""); setQuery({ q: "", status: "", page: 1 }); }

  return <section aria-label="Order history" aria-busy={loading}>
    <p>New, unpaid cash-on-delivery orders can be cancelled here before the store confirms them. Other changes need store review.</p>
    {notice && <p role="status" className="admin-success">{notice}</p>}
    {actionError && <p role="alert" className="admin-error">{actionError}</p>}
    <form className="order-history-filters" onSubmit={event => { event.preventDefault(); setQuery({ q: search.trim(), status, page: 1 }); }}>
      <div className="field"><label htmlFor="order-search">Order reference</label><input id="order-search" type="search" placeholder="e.g. VL-…" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div className="field"><label htmlFor="order-status">Order status</label><select id="order-status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{orderStatuses.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></div>
      <button className="button-dark" disabled={loading}>Find orders</button>
      {(filtered || search || status) && <button type="button" className="button-outline" onClick={reset}>Clear order filters</button>}
    </form>
    {loading ? <p role="status">Loading your orders...</p> : error ? <div><p role="alert" className="admin-error">{error}</p><button className="button-outline" onClick={() => setRetry(value => value + 1)}>Retry loading orders</button></div> : history && <>
      <p className="order-history-count" role="status">{history.total} {history.total === 1 ? "order" : "orders"}{filtered ? " matching your filters" : " in your account"}</p>
      {!history.orders.length ? <div className="empty-state"><h2>{filtered ? "No matching orders." : "Your story starts here."}</h2><p>{filtered ? "Try another reference or status to find your purchase." : "Orders placed while signed in will appear here. For earlier guest purchases, use your original confirmation link."}</p>{filtered ? <button className="button-outline" onClick={reset}>Show all orders</button> : <Link className="button-dark" href="/products">Explore the collection</Link>}</div> : history.orders.map(order => <article className="form-card account-order" key={order.orderNumber}>
        <div><h2>{order.orderNumber}</h2><p>{new Date(order.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p><span className="badge">{labels[order.status] ?? order.status}</span><p>Payment: {order.paymentStatus.toLowerCase()}</p></div>
        <div>{order.items.map((item, index) => <p key={index}>{item.name} × {item.quantity}</p>)}<strong>{money(order.total)}</strong></div>
        <div className="account-order-actions"><Link className="button-outline" href={`/order-success?token=${encodeURIComponent(order.receiptToken)}`}>View order details</Link><BuyAgain items={order.items} />{order.canCancel && <button className="button-outline" disabled={Boolean(cancelling)} aria-label={`Cancel order ${order.orderNumber}`} onClick={() => void cancelOrder(order)}>{cancelling === order.orderNumber ? "Cancelling..." : "Cancel order"}</button>}</div>
      </article>)}
      {history.pages > 1 && <nav className="order-history-pagination" aria-label="Order history pages"><button className="button-outline" disabled={history.page <= 1} onClick={() => setQuery({ ...query, page: history.page - 1 })}>Previous orders</button><span>Page {history.page} of {history.pages}</span><button className="button-outline" disabled={history.page >= history.pages} onClick={() => setQuery({ ...query, page: history.page + 1 })}>Next orders</button></nav>}
    </>}
  </section>;
}
