export type CartItem = { id: string; slug: string; name: string; price: number; image: string; quantity: number; stock?: number };
export const MAX_CART_ITEMS = 30;
export function stockLimit(stock?: number) { return Math.max(0, Math.min(99, Number.isInteger(stock) ? stock! : 99)); }
export function cleanCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const result: CartItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || !["id","slug","name","image"].every(key => typeof item[key] === "string" && item[key].length > 0) || !Number.isInteger(item.price) || item.price < 0 || !Number.isSafeInteger(item.price) || !Number.isInteger(item.quantity) || item.quantity <= 0 || (item.stock !== undefined && (!Number.isInteger(item.stock) || item.stock < 0))) continue;
    const quantity = Math.min(item.quantity, stockLimit(item.stock));
    if (!quantity) continue;
    const existing = result.find(row => row.id === item.id);
    if (existing) existing.quantity = Math.min(stockLimit(item.stock), existing.quantity + quantity);
    else if (result.length < MAX_CART_ITEMS) result.push({ id: item.id, slug: item.slug, name: item.name, image: item.image, price: item.price, quantity, ...(item.stock === undefined ? {} : { stock: item.stock }) });
  }
  return result;
}
export function addCartItem(items: CartItem[], product: Omit<CartItem,"quantity">, quantity = 1): CartItem[] {
  if (!Number.isInteger(quantity) || quantity < 1 || stockLimit(product.stock) < 1) return items;
  const previous = items.find(item => item.id === product.id);
  if (!previous && items.length >= MAX_CART_ITEMS) return items;
  return previous ? items.map(item => item.id === product.id ? { ...product, quantity: Math.min(stockLimit(product.stock), item.quantity + quantity) } : item) : [...items, { ...product, quantity: Math.min(stockLimit(product.stock), quantity) }];
}
