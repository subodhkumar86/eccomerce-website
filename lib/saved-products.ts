export function availableSavedProducts<T extends { id: string; stock: number }>(products: T[], items: { id: string; quantity: number }[]): T[] {
  return products.filter(product => product.stock > 0 && (items.find(item => item.id === product.id)?.quantity ?? 0) < Math.min(99, product.stock));
}
