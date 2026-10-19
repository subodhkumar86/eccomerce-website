export function toggleComparison<T extends { id: string }>(items: T[], product: T): T[] {
  return items.some(item => item.id === product.id)
    ? items.filter(item => item.id !== product.id)
    : items.length < 3 ? [...items, product] : items;
}

export function rememberProduct(previous: string[], id: string): string[] {
  return [id, ...previous.filter(value => value !== id)].slice(0, 8);
}
