const steps = [
  ["NEW", "Received"], ["CONFIRMED", "Confirmed"], ["PROCESSING", "Preparing"],
  ["SHIPPED", "Shipped"], ["DELIVERED", "Delivered"],
];

export function OrderProgress({ status }: { status: string }) {
  if (status === "CANCELLED") return <div className="order-cancelled" role="status"><strong>Order cancelled</strong><p>This order will not be dispatched. Contact the studio if you need help with a recorded payment.</p></div>;
  const current = steps.findIndex(([value]) => value === status);
  return <ol className="order-progress" aria-label="Order progress">
    {steps.map(([value, label], index) => <li key={value} className={index <= current ? "reached" : undefined} aria-current={index === current ? "step" : undefined}>
      <span aria-hidden="true">{index < current ? "✓" : index + 1}</span>
      <div>{label}<small>{index < current ? "Complete" : index === current ? "Current status" : "Upcoming"}</small></div>
    </li>)}
  </ol>;
}
