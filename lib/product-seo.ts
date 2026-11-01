type SeoProduct = { id: string; name: string; slug: string; description: string; image: string; price: number; stock: number };

export function productStructuredData(product: SeoProduct, origin?: string) {
  const url = origin ? `${origin}/products/${encodeURIComponent(product.slug)}` : undefined;
  return {
    "@context": "https://schema.org", "@type": "Product", name: product.name,
    description: product.description, image: product.image, sku: product.id,
    ...(url ? { url, offers: { "@type": "Offer", url, priceCurrency: "INR", price: String(product.price), availability: `https://schema.org/${product.stock > 0 ? "InStock" : "OutOfStock"}` } } : {}),
  };
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
