export const orderStatuses = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export const paymentStatuses = ["PENDING", "PAID", "REFUNDED"] as const;
export function orderTransitionError(previous: string, next?: string): string | null {
  if (!next || next === previous) return null;
  const allowed: Record<string, string[]> = {
    NEW: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED"], DELIVERED: [], CANCELLED: [],
  };
  return allowed[previous]?.includes(next) ? null : `Cannot move an order from ${previous} to ${next}.`;
}
