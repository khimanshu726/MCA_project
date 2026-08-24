import fs from "node:fs";
import path from "node:path";
import { getProductById } from "../services/productStore.js";
import { injectMeta, resolveRouteMeta } from "../services/seoMeta.js";

/**
 * Server-side prerender for crawlers. The storefront is a client-rendered SPA, so
 * the raw HTML is an empty shell — fine for Google (it renders JS) but slow to
 * index, and invisible to social link-preview bots that never run JavaScript.
 *
 * For a recognized bot requesting an HTML page, this injects the route's real
 * title, description, canonical, Open Graph, and structured data into the HTML
 * shell (product pages get their data looked up from the DB). Real users are
 * untouched — they get the normal SPA and hydrate as before. The injected
 * metadata is the same the client renders, so this is equivalent content, not
 * cloaking. Any failure falls through to the normal shell.
 */
const BOT_UA =
  /(googlebot|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandex(bot)?|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|slackbot|telegrambot|discordbot|pinterest|redditbot|applebot|petalbot|bytespider|embedly|quora link preview|outbrain|vkshare|w3c_validator|semrushbot|ahrefsbot|screaming frog)/i;

// index.html is immutable per deploy, so read it once.
let cachedTemplate;
const readTemplate = (distPath) => {
  if (cachedTemplate === undefined) {
    try {
      cachedTemplate = fs.readFileSync(path.join(distPath, "index.html"), "utf8");
    } catch {
      cachedTemplate = null;
    }
  }
  return cachedTemplate;
};

const isNonPageRequest = (p) =>
  p.startsWith("/api") ||
  p.startsWith("/uploads") ||
  p.startsWith("/assets") ||
  p.startsWith("/admin") ||
  p === "/robots.txt" ||
  p === "/sitemap.xml" ||
  /\.[a-z0-9]+$/i.test(p); // any file with an extension (js/css/img/ico/…)

export const createBotPrerender = (distPath) => async (req, res, next) => {
  const ua = req.headers["user-agent"] || "";
  if (req.method !== "GET" || !BOT_UA.test(ua) || isNonPageRequest(req.path)) {
    return next();
  }

  const template = readTemplate(distPath);
  if (!template) return next();

  try {
    let product = null;
    const productMatch = req.path.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      product = await getProductById(decodeURIComponent(productMatch[1]));
    }

    const meta = resolveRouteMeta(req.path, req.query.category || null, product);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    return res.send(injectMeta(template, meta));
  } catch (error) {
    console.error("[botPrerender] failed, serving shell:", error?.message || error);
    return next();
  }
};
