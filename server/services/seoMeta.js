import { BUSINESS } from "../../src/config/business.js";

/**
 * Server-side SEO metadata per route, mirroring src/components/Seo.jsx so a
 * crawler that doesn't run JavaScript (Google's first pass, and every social
 * link-preview bot) still gets the real title, description, canonical, Open
 * Graph, and structured data in the raw HTML. Canonical host is the apex
 * (BUSINESS.url) — see the redirect-loop fix.
 */
const SITE_URL = BUSINESS.url;
const SITE_NAME = BUSINESS.name;
const DEFAULT_DESCRIPTION =
  "Elite Impressions is a premium print shop for custom business cards, brochures, banners, packaging, invitations, and institutional supplies — easy to customize, fast to reorder.";
const DEFAULT_IMAGE =
  "https://images.pexels.com/photos/36412293/pexels-photo-36412293.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop";

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: SITE_NAME,
  legalName: BUSINESS.legalName,
  alternateName: BUSINESS.legalName,
  description:
    "Printing press in Purnia, Bihar for custom business cards, marketing materials, banners, invitations, packaging, merchandise, photo gifts, stationery, and institutional supplies. Pan-India shipping, local delivery, and store pickup.",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  image: DEFAULT_IMAGE,
  email: BUSINESS.email,
  telephone: BUSINESS.phone,
  priceRange: "₹₹",
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.address.street,
    addressLocality: BUSINESS.address.locality,
    addressRegion: BUSINESS.address.region,
    postalCode: BUSINESS.address.postalCode,
    addressCountry: BUSINESS.address.country,
  },
  areaServed: BUSINESS.areaServed,
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: BUSINESS.openingDays, opens: BUSINESS.opens, closes: BUSINESS.closes },
  ],
  sameAs: [BUSINESS.instagram, BUSINESS.googleMapsUrl].filter(Boolean),
};

const productJsonLd = (product) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.description,
  image: product.images,
  category: product.category,
  sku: product.sku || product.id,
  brand: { "@type": "Brand", name: SITE_NAME },
  offers: {
    "@type": "Offer",
    priceCurrency: "INR",
    price: product.price,
    url: `${SITE_URL}/products/${product.id}`,
    availability:
      Number(product.stock) >= (product.minimumOrderQty || 1)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
  },
});

const withBrand = (title) => (title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Premium Print Shop`);

/**
 * Resolve head metadata for a path. `category` is the ?category= value (products
 * page); `product` is the resolved product doc for /products/:id (or null).
 */
export function resolveRouteMeta(pathname, category, product) {
  const base = { image: DEFAULT_IMAGE, type: "website", jsonLd: [] };

  // Product detail
  const productMatch = /^\/products\/[^/]+$/.test(pathname);
  if (productMatch && product) {
    return {
      ...base,
      title: withBrand(product.name),
      description: product.description || DEFAULT_DESCRIPTION,
      canonical: `${SITE_URL}/products/${product.id}`,
      image: product.images?.[0] || DEFAULT_IMAGE,
      type: "product",
      jsonLd: [productJsonLd(product)],
    };
  }

  if (pathname === "/" || pathname === "") {
    return {
      ...base,
      title: withBrand("Printing Press in Purnia, Bihar"),
      description:
        "Bihar Press (Elite Impressions) is a printing press in Purnia, Bihar for custom business cards, flyers, banners, invitations, packaging, merchandise, and institutional supplies. Order online with pan-India shipping, local delivery in Purnia, and store pickup.",
      canonical: `${SITE_URL}/`,
      jsonLd: [localBusinessJsonLd],
    };
  }

  if (pathname === "/products") {
    if (category && category !== "All") {
      return {
        ...base,
        title: withBrand(category),
        description: `Shop custom ${category.toLowerCase()} at Elite Impressions — design online, order in bulk, and reorder fast.`,
        canonical: `${SITE_URL}/products?category=${encodeURIComponent(category)}`,
      };
    }
    return {
      ...base,
      title: withBrand("Shop All Print Products"),
      description:
        "Browse Elite Impressions' full catalog — business cards, marketing materials, banners, invitations, packaging, merchandise, and institutional supplies.",
      canonical: `${SITE_URL}/products`,
    };
  }

  if (pathname === "/institutions") {
    return {
      ...base,
      title: withBrand("Institutional Print Supplies for Schools & Colleges"),
      description:
        "Bulk question papers, attendance & general registers, service books, and answer booklets — printed to institutional formats for schools, colleges, and universities. Buy online or request a bulk quote.",
      canonical: `${SITE_URL}/institutions`,
    };
  }

  if (pathname === "/customize" || /^\/customize\//.test(pathname)) {
    return {
      ...base,
      title: withBrand("Design Studio — Customize Your Print"),
      description:
        "Design your print online: start from a template, upload your own artwork, and see a live preview before you order.",
      canonical: `${SITE_URL}/customize`,
    };
  }

  // Fallback: brand default pointing at the homepage.
  return {
    ...base,
    title: withBrand(null),
    description: DEFAULT_DESCRIPTION,
    canonical: `${SITE_URL}/`,
  };
}

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );

/**
 * Splice resolved metadata into an index.html template: replace the fallback
 * <title>, then insert description/canonical/robots/OG/Twitter/JSON-LD before
 * </head>. Returns the new HTML string.
 */
export function injectMeta(template, meta) {
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<meta property="og:type" content="${escapeHtml(meta.type)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
    ...(meta.jsonLd || []).map(
      (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`,
    ),
  ].join("\n    ");

  const titled = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  return titled.replace(/<\/head>/i, `    ${tags}\n  </head>`);
}
