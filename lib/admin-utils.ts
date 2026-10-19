import type { Order } from "@/lib/admin-types";

export function csvText(rows: (string | number)[][]): string {
  return rows.map(row => row.map(value => {
    const text = String(value);
    const safe = typeof value === "string" && /^[\s]*[=+@\-\t\r\n]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function customerSummaries(orders: Order[]) {
  const customers = new Map<string, { email: string; name: string; phone: string; city: string; orders: number; value: number; lastOrder: string }>();
  for (const order of orders) {
    const key = order.email.trim().toLowerCase();
    const current = customers.get(key) ?? { email: key, name: order.customerName, phone: order.phone, city: order.city, orders: 0, value: 0, lastOrder: order.createdAt };
    current.orders++;
    if (order.status !== "CANCELLED") current.value += order.total;
    if (order.createdAt >= current.lastOrder) { current.lastOrder = order.createdAt; current.name = order.customerName; current.phone = order.phone; current.city = order.city; }
    customers.set(key, current);
  }
  return [...customers.values()].sort((a, b) => b.lastOrder.localeCompare(a.lastOrder));
}
