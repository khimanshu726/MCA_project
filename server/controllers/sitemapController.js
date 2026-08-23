import { Product } from "../models/Product.js";

// Canonical site origin for search. Defaults to the www host the shop wants to
// rank; override with SITE_URL if the canonical domain ever changes.
const SITE_URL = (process.env.SITE_URL || "https://eliteimpressions.co.in").replace(/\/$/, "");

// Public, crawlable routes that always exist regardless of catalog contents.
const STATIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/products", priority: "0.9" },
  { path: "/institutions", priority: "0.8" },
  { path: "/customize", priority: "0.6" },
];

const escapeXml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch]);

const urlEntry = ({ loc, lastmod, priority }) =>
  `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}    <priority>${priority}</priority>\n  </url>`;

/**
 * Dynamic XML sitemap so Google can discover every public page — the static
 * routes plus a URL for each active product — without depending on the SPA
 * rendering. Regenerated per request (the catalog is small) and cached briefly
 * at the edge. Registered before the SPA catch-all so it isn't shadowed by
 * index.html.
 */
export const getSitemap = async (_req, res) => {
  try {
    const products = await Product.find({ status: "active" }, { id: 1, updatedAt: 1 }).lean();

    const entries = [
      ...STATIC_ROUTES.map((route) => ({ loc: `${SITE_URL}${route.path}`, priority: route.priority })),
      ...products.map((product) => ({
        loc: `${SITE_URL}/products/${product.id}`,
        lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString().slice(0, 10) : null,
        priority: "0.7",
      })),
    ];

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `${entries.map(urlEntry).join("\n")}\n` +
      `</urlset>\n`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    return res.send(xml);
  } catch (error) {
    console.error("[sitemap] failed to build", error);
    return res.status(500).set("Content-Type", "application/xml").send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset/>');
  }
};
