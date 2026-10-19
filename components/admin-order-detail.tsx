"use client";
import { useState } from "react";
import type { Order } from "@/lib/admin-types";
import { orderStatuses, paymentStatuses, orderTransitionError } from "@/lib/order-workflow";
import { money } from "@/lib/money";
import { AdminDialog } from "@/components/admin-dialog";
import { adminRequest } from "@/lib/admin-client";

export function AdminOrderDetail({ order, onClose, onSaved }: { order: Order; onClose: () => void; onSaved: () => void }) {
  const [status,setStatus] = useState(order.status), [payment,setPayment] = useState(order.paymentStatus);
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "CANCELLED" && order.status !== "CANCELLED" && !window.confirm(`Cancel ${order.orderNumber} and return its items to inventory?`)) return;
    setBusy(true); setError("");
    try { await adminRequest(`/api/admin/orders/${order.id}`, "PATCH", { status, paymentStatus: payment }); onSaved(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not update this order."); } finally { setBusy(false); }
  }
  return <AdminDialog title={`Order ${order.orderNumber}`} onClose={onClose} busy={busy}><div className="order-detail-meta"><section><h3>Customer & delivery</h3><p>{order.customerName}<br/><a href={`mailto:${order.email}`}>{order.email}</a><br/>{order.phone}</p><p>{order.address}<br/>{order.city} {order.postalCode}</p></section><section><h3>Order information</h3><p>{new Date(order.createdAt).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}<br/>{order.paymentMethod}</p>{order.notes && <><h3>Customer notes</h3><p className="order-notes">{order.notes}</p></>}</section></div><div className="admin-table-wrap"><table className="admin-table order-items-table"><thead><tr><th>Object</th><th>Price</th><th>Quantity</th><th>Total</th></tr></thead><tbody>{order.items.map((item,index) => <tr key={index}><td>{item.name}</td><td>{money(item.price)}</td><td>{item.quantity}</td><td>{money(item.price * item.quantity)}</td></tr>)}</tbody></table></div><div className="order-detail-totals"><p>Subtotal <strong>{money(order.subtotal)}</strong></p><p>Delivery <strong>{money(order.shipping)}</strong></p><p>Total <strong>{money(order.total)}</strong></p></div><form onSubmit={submit}>{error && <p className="admin-error" role="alert">{error}</p>}<fieldset disabled={busy} className="admin-fieldset"><div className="admin-form-grid"><div className="field"><label htmlFor="order-status">Order status</label><select id="order-status" value={status} onChange={event => setStatus(event.target.value)}>{orderStatuses.map(value => <option key={value} value={value} disabled={Boolean(orderTransitionError(order.status,value))}>{value}</option>)}</select></div><div className="field"><label htmlFor="order-payment">Payment status</label><select id="order-payment" value={payment} onChange={event => setPayment(event.target.value)}>{paymentStatuses.map(value => <option value={value} key={value} disabled={(value === "REFUNDED" && !["PAID","REFUNDED"].includes(order.paymentStatus)) || (order.paymentStatus === "REFUNDED" && value !== "REFUNDED")}>{value}</option>)}</select></div></div><p className="table-muted">Payment status records an action you have completed. It does not collect money or issue a refund.</p><div className="admin-dialog-actions"><button className="admin-button primary" disabled={status === order.status && payment === order.paymentStatus}>{busy ? "Saving…" : "Save order changes"}</button></div></fieldset></form></AdminDialog>;
}
