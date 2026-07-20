const normalize = (value) => (value || "").toLowerCase();

const matchesQuery = (product, trimmedQuery) =>
  normalize(product.name).includes(trimmedQuery) || normalize(product.category).includes(trimmedQuery);

// Results starting with the query rank above results that merely contain it,
// so typing "vis" surfaces "Visiting Card" before "Photo Mug (visual proof)".
const rank = (product, trimmedQuery) => {
  const name = normalize(product.name);
  if (name.startsWith(trimmedQuery)) return 0;
  if (name.includes(trimmedQuery)) return 1;
  return 2;
};

export function filterProducts(products, query) {
  const trimmedQuery = normalize(query).trim();
  if (!trimmedQuery) return products;

  return products
    .filter((product) => matchesQuery(product, trimmedQuery))
    .sort((a, b) => rank(a, trimmedQuery) - rank(b, trimmedQuery));
}
