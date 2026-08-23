/**
 * Per-page SEO metadata. React 19 hoists <title>/<meta>/<link> rendered here into
 * <head>, and removes them again on route change — so each page gets its own
 * title, description, and a self-referencing canonical instead of every route
 * inheriting the homepage's (which was telling Google the whole site was a
 * duplicate of the homepage). Optional JSON-LD structured data rides along.
 */
// Canonical host is the apex (non-www). The hosting layer redirects www → apex,
// so the apex is the URL that actually serves 200 and must be the canonical.
export const SITE_URL = "https://eliteimpressions.co.in";
export const SITE_NAME = "Elite Impressions";

const DEFAULT_DESCRIPTION =
  "Elite Impressions is a premium print shop for custom business cards, brochures, banners, packaging, invitations, and institutional supplies — easy to customize, fast to reorder.";
const DEFAULT_IMAGE =
  "https://images.pexels.com/photos/36412293/pexels-photo-36412293.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop";

function Seo({ title, description, path = "", image, type = "website", noindex = false, jsonLd = null }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Premium Print Shop`;
  const desc = description || DEFAULT_DESCRIPTION;
  const canonical = `${SITE_URL}${path}`;
  const ogImage = image || DEFAULT_IMAGE;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={noindex ? "noindex, follow" : "index, follow"} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
    </>
  );
}

export default Seo;
