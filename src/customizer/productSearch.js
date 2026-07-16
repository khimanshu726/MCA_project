/**
 * Product filtering for the studio's product picker.
 *
 * Case-insensitive partial match across name and category. Name-prefix
 * matches rank first, so typing "ban" surfaces "Banner" above a product
 * that merely sits in the Banners category.
 */
export function filterProducts(products, query) {
  const term = query.trim().toLowerCase();

  if (!term) {
    return products;
  }

  const matches = products.filter(
    (product) =>
      product.name.toLowerCase().includes(term) || (product.category || "").toLowerCase().includes(term),
  );

  return matches.sort((a, b) => {
    const aPrefix = a.name.toLowerCase().startsWith(term);
    const bPrefix = b.name.toLowerCase().startsWith(term);
    if (aPrefix !== bPrefix) {
      return aPrefix ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
