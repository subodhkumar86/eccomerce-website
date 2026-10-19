type ObjectView = { id: string; price: number; stock: number; active: boolean; featured: boolean; category: { slug: string } | null };
export type GiftPreferences = { budget: number | null; category: string; occasion: string };
const occasionCategories: Record<string, string> = { housewarming: "home-objects", thanks: "accessories", ritual: "fragrance" };

export function findGifts<T extends ObjectView>(products: T[], preferences: GiftPreferences): T[] {
  const preferred = occasionCategories[preferences.occasion];
  return products.filter(product => product.active && product.stock > 0 && (preferences.budget === null || product.price <= preferences.budget) && (!preferences.category || product.category?.slug === preferences.category))
    .sort((a, b) => Number(Boolean(preferred && b.category?.slug === preferred)) - Number(Boolean(preferred && a.category?.slug === preferred)) || Number(b.featured) - Number(a.featured) || a.price - b.price);
}

export function relatedProducts<T extends ObjectView>(products: T[], current: T, limit = 4): T[] {
  return products.filter(product => product.id !== current.id && product.active && product.stock > 0)
    .sort((a, b) => Number(Boolean(current.category && b.category?.slug === current.category.slug)) - Number(Boolean(current.category && a.category?.slug === current.category.slug)) || Math.abs(a.price - current.price) - Math.abs(b.price - current.price))
    .slice(0, Math.max(0, limit));
}
