/**
 * Builds the catalogue's product mockups: real photos of blank items (free
 * Pexels licence) with a sample customer logo printed on them, written to
 * public/images/catalog/<id>.jpg.
 *
 *   node scripts/buildCatalogMockups.mjs <folder with the base photos>
 *
 * The base photos are not committed; their Pexels ids are listed in BASES so
 * they can be downloaded again (?w=1600). The brands are invented samples.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [, , baseDir] = process.argv;
if (!baseDir) {
  console.error("Usage: node scripts/buildCatalogMockups.mjs <base photo folder>");
  process.exit(1);
}
const outDir = path.resolve("public/images/catalog");
fs.mkdirSync(outDir, { recursive: true });

// Pexels photo ids of the blank items (downloaded at w=1600).
export const BASES = {
  tee: 12039633,
  polo: 11751211,
  hoodie: 8217415,
  cap: 9558763,
  tote: 6786665,
  bottle: 25382222,
  pens: 296125,
  apron: 6205454,
  cardsMatte: 5706015,
  cardsGlossy: 8489955,
  cardsRounded: 4466116,
  cardsLinen: 8533651,
  cardsVelvet: 4464263,
  cardsSpotUV: 8947550,
  cardsFoil: 6373853,
  cardsKraft: 6373857,
  mailer: 9594423,
  productBox: 8015704,
  stickers: 8250900,
  jar: 8947557,
  paperBag: 25533235,
  hangTag: 8148580,
  tape: 17260157,
  tissue: 9594432,
};
const FILES = {
  pens: "pens-296125.jpg",
  paperBag: "paperBag2.jpg",
  cardsKraft: "cardsKraft2.jpg",
  stickers: "cardsKraft.jpg",
};
const baseFile = (key) => path.join(baseDir, FILES[key] || `${key}.jpg`);

/* ------------------------------------------------------------------ */
/* Sample brands (invented)                                            */
/* ------------------------------------------------------------------ */

const ICONS = {
  // Northwind Studio: two peaks.
  peaks: (c) =>
    `<path d="M8 78 L38 30 L52 52 L64 36 L92 78 Z" fill="${c}"/><path d="M38 30 L46 43 L40 41 L34 46 Z" fill="#fff" fill-opacity=".85"/>`,
  // Leaf & Loom: a leaf.
  leaf: (c) =>
    `<path d="M20 80 C20 40 50 15 85 15 C85 52 60 80 20 80 Z" fill="${c}"/><path d="M24 76 C40 58 56 42 76 24" stroke="#fff" stroke-opacity=".8" stroke-width="3" fill="none"/>`,
  // Chai Collective: a cup with steam.
  cup: (c) =>
    `<path d="M18 44 H72 V58 C72 74 60 84 45 84 C30 84 18 74 18 58 Z" fill="${c}"/><path d="M72 50 C86 50 86 68 72 68" stroke="${c}" stroke-width="6" fill="none"/><path d="M34 36 C28 28 40 22 34 12 M48 36 C42 28 54 22 48 12" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  // Kosi Bakehouse: a wheat ear.
  wheat: (c) =>
    `<path d="M50 90 V20" stroke="${c}" stroke-width="5"/>${[0, 1, 2, 3]
      .map(
        (i) =>
          `<ellipse cx="40" cy="${30 + i * 14}" rx="7" ry="12" transform="rotate(-35 40 ${30 + i * 14})" fill="${c}"/><ellipse cx="60" cy="${30 + i * 14}" rx="7" ry="12" transform="rotate(35 60 ${30 + i * 14})" fill="${c}"/>`,
      )
      .join("")}<ellipse cx="50" cy="16" rx="6" ry="11" fill="${c}"/>`,
  // Saffron Spice Co.: a crocus.
  crocus: (c) =>
    `${[0, 60, 120, 180, 240, 300].map((r) => `<ellipse cx="50" cy="30" rx="11" ry="22" transform="rotate(${r} 50 50)" fill="${c}"/>`).join("")}<circle cx="50" cy="50" r="9" fill="#fff" fill-opacity=".9"/>`,
};

const BRANDS = {
  northwind: {
    name: "NORTHWIND",
    sub: "STUDIO",
    icon: "peaks",
    font: "Segoe UI, Arial, sans-serif",
    weight: 700,
    spacing: 6,
  },
  leaf: { name: "Leaf & Loom", sub: "HANDWOVEN GOODS", icon: "leaf", font: "Georgia, serif", weight: 400, spacing: 0 },
  chai: { name: "Chai Collective", sub: "EST. PURNIA", icon: "cup", font: "Georgia, serif", weight: 700, spacing: 0 },
  kosi: {
    name: "Kosi Bakehouse",
    sub: "BAKED FRESH DAILY",
    icon: "wheat",
    font: "Georgia, serif",
    weight: 700,
    spacing: 0,
  },
  saffron: { name: "Saffron", sub: "SPICE CO.", icon: "crocus", font: "Georgia, serif", weight: 400, spacing: 2 },
};

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const svg = (w, h, body, defs = "") =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`,
  );

/** Icon above the name and a small line under it, centred in w×h. */
const stackLogo = (brandKey, w, h, color, { iconScale = 0.42, sub = true, fill } = {}) => {
  const b = BRANDS[brandKey];
  const paint = fill || color;
  const iconSize = Math.min(w, h) * iconScale;
  // Rough glyph width per font, so the name always fits the space.
  const glyph = b.font.startsWith("Georgia") ? 0.56 : 0.74;
  const nameSize = Math.min((w * 0.92 - b.spacing * b.name.length) / (b.name.length * glyph), h * 0.2);
  const subSize = nameSize * 0.36;
  const total = iconSize + nameSize * 1.15 + (sub ? subSize * 1.9 : 0);
  const top = (h - total) / 2;
  return `<g transform="translate(${(w - iconSize) / 2} ${top}) scale(${iconSize / 100})">${ICONS[b.icon](paint)}</g>
  <text x="${w / 2}" y="${top + iconSize + nameSize * 1.0}" text-anchor="middle" font-family="${b.font}" font-weight="${b.weight}" font-size="${nameSize}" letter-spacing="${b.spacing}" fill="${paint}">${b.name.replace("&", "&amp;")}</text>
  ${sub ? `<text x="${w / 2}" y="${top + iconSize + nameSize * 1.15 + subSize * 1.6}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${subSize}" letter-spacing="${subSize * 0.35}" fill="${paint}">${b.sub}</text>` : ""}`;
};

/** Icon left of the name, for wide spaces. */
const rowLogo = (brandKey, w, h, color, { fill } = {}) => {
  const b = BRANDS[brandKey];
  const paint = fill || color;
  const iconSize = h * 0.8;
  const glyph = b.font.startsWith("Georgia") ? 0.56 : 0.74;
  const nameSize = Math.min(h * 0.45, (w - iconSize * 1.2 - b.spacing * b.name.length) / (b.name.length * glyph));
  return `<g transform="translate(0 ${(h - iconSize) / 2}) scale(${iconSize / 100})">${ICONS[b.icon](paint)}</g>
  <text x="${iconSize * 1.15}" y="${h / 2 + nameSize * 0.35}" font-family="${b.font}" font-weight="${b.weight}" font-size="${nameSize}" letter-spacing="${b.spacing}" fill="${paint}">${b.name.replace("&", "&amp;")}</text>`;
};

/** The back of a visiting card: name, role and contact lines. */
const cardBack = (brandKey, w, h, color, { person = "Aditi Sharma", role = "Founder", fill } = {}) => {
  const paint = fill || color;
  // Sized by the shorter side, so an upright (portrait) card works too.
  const s = Math.min(h, w * 0.62) / 100;
  return `<g transform="translate(${w * 0.08} ${h * 0.14}) scale(${(s * 20) / 100})">${ICONS[BRANDS[brandKey].icon](paint)}</g>
  <text x="${w * 0.08}" y="${h * 0.56}" font-family="Georgia, serif" font-weight="700" font-size="${9 * s}" fill="${paint}">${esc(person)}</text>
  <text x="${w * 0.08}" y="${h * 0.66}" font-family="Segoe UI, Arial, sans-serif" font-size="${5 * s}" letter-spacing="${0.8 * s}" fill="${paint}">${esc(role.toUpperCase())}</text>
  <text x="${w * 0.08}" y="${h * 0.8}" font-family="Segoe UI, Arial, sans-serif" font-size="${5 * s}" fill="${paint}">+91 90000 12345</text>
  <text x="${w * 0.08}" y="${h * 0.88}" font-family="Segoe UI, Arial, sans-serif" font-size="${5 * s}" fill="${paint}">Manjhili Chowk, Purnia</text>`;
};

const GOLD = `<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6420"/><stop offset=".35" stop-color="#f3d27a"/><stop offset=".55" stop-color="#b8892f"/><stop offset=".8" stop-color="#f7e3a1"/><stop offset="1" stop-color="#9a7228"/></linearGradient>`;
const SILVER = `<linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9aa0a6"/><stop offset=".4" stop-color="#f4f6f8"/><stop offset=".6" stop-color="#b9bec4"/><stop offset="1" stop-color="#e8ebee"/></linearGradient>`;
const GLOSS = `<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2a2c"/><stop offset=".45" stop-color="#5c5c60"/><stop offset=".55" stop-color="#222224"/><stop offset="1" stop-color="#3a3a3d"/></linearGradient>`;

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */

/**
 * A design placed on the photo. Either rotated around its centre
 * ({cx, cy, angle}) or mapped onto a parallelogram ({origin, xVec, yVec}).
 */
const renderLayer = async (layer) => {
  const scale = 2;
  const { w, h } = layer;
  let img = sharp(svg(w * scale, h * scale, `<g transform="scale(${scale})">${layer.body}</g>`, layer.defs || ""), {
    density: 144,
  })
    .resize(Math.round(w), Math.round(h))
    .png();
  let buf = await img.toBuffer();
  if (layer.blur) buf = await sharp(buf).blur(layer.blur).png().toBuffer();

  if (layer.xVec) {
    const [ax, ay] = layer.xVec;
    const [bx, by] = layer.yVec;
    const matrix = [ax / w, bx / h, ay / w, by / h];
    const out = await sharp(buf)
      .affine(matrix, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer({ resolveWithObject: true });
    const xs = [0, ax, bx, ax + bx];
    const ys = [0, ay, by, ay + by];
    return {
      input: out.data,
      left: Math.round(layer.origin[0] + Math.min(...xs)),
      top: Math.round(layer.origin[1] + Math.min(...ys)),
    };
  }

  const rotated = await sharp(buf)
    .rotate(layer.angle || 0, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    input: rotated.data,
    left: Math.round(layer.cx - rotated.info.width / 2),
    top: Math.round(layer.cy - rotated.info.height / 2),
  };
};

const opacityWrap = (body, opacity = 1) => (opacity < 1 ? `<g opacity="${opacity}">${body}</g>` : body);

/** Square patches that round a card's corners, taken from the surface next to it. */
const roundedCornerPatches = async (src, rect, r) => {
  const [x0, y0, x1, y1] = rect;
  const patches = [];
  const corners = [
    { x: x0, y: y0, from: [x0 - r - 10, y0], path: `M0 0 H${r} A${r} ${r} 0 0 0 0 ${r} Z` },
    { x: x1 - r, y: y0, from: [x1 + 10, y0], path: `M${r} 0 V${r} A${r} ${r} 0 0 0 0 0 Z` },
    { x: x0, y: y1 - r, from: [x0 - r - 10, y1 - r], path: `M0 ${r} V0 A${r} ${r} 0 0 0 ${r} ${r} Z` },
    { x: x1 - r, y: y1 - r, from: [x1 + 10, y1 - r], path: `M${r} ${r} H0 A${r} ${r} 0 0 0 ${r} 0 Z` },
  ];
  for (const corner of corners) {
    const patch = await sharp(src)
      .extract({ left: corner.from[0], top: corner.from[1], width: r, height: r })
      .png()
      .toBuffer();
    const mask = svg(r, r, `<path d="${corner.path}" fill="#fff"/>`);
    const masked = await sharp(patch)
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();
    patches.push({ input: masked, left: corner.x, top: corner.y });
  }
  return patches;
};

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

const INK = "#1f2328";
const KRAFT_INK = "#2b2118";

const MOCKUPS = [
  // ---------- Clothing & Merchandise ----------
  {
    id: "round-neck-tshirt",
    base: "tee",
    crop: { left: 267, top: 0, size: 1067 },
    layers: [{ w: 330, h: 300, cx: 792, cy: 480, body: stackLogo("northwind", 330, 300, INK), blend: "multiply" }],
  },
  {
    id: "polo-tshirt",
    base: "polo",
    crop: { left: 267, top: 0, size: 1067 },
    layers: [
      {
        w: 150,
        h: 120,
        cx: 905,
        cy: 612,
        body: stackLogo("leaf", 150, 120, "#000", { sub: false, iconScale: 0.5 }),
        blend: "multiply",
        blur: 1.2,
      },
      {
        w: 150,
        h: 120,
        cx: 903,
        cy: 609,
        body: opacityWrap(stackLogo("leaf", 150, 120, "#fff", { sub: false, iconScale: 0.5 }), 0.95),
        blend: "over",
      },
    ],
  },
  {
    id: "printed-hoodie",
    base: "hoodie",
    crop: { left: 0, top: 450, size: 1600 },
    layers: [{ w: 560, h: 520, cx: 830, cy: 1360, body: stackLogo("northwind", 560, 520, INK), blend: "multiply" }],
  },
  {
    id: "embroidered-cap",
    base: "cap",
    crop: { left: 0, top: 300, size: 1600 },
    layers: [
      {
        w: 320,
        h: 230,
        cx: 780,
        cy: 790,
        body: stackLogo("chai", 320, 230, "#000", { iconScale: 0.45 }),
        blend: "multiply",
        blur: 1.5,
      },
      {
        w: 320,
        h: 230,
        cx: 778,
        cy: 786,
        body: stackLogo("chai", 320, 230, "#5a2d16", { iconScale: 0.45 }),
        blend: "over",
      },
    ],
  },
  {
    id: "canvas-tote-bag",
    base: "tote",
    crop: { left: 0, top: 1000, size: 1600 },
    layers: [
      {
        w: 620,
        h: 560,
        cx: 800,
        cy: 1960,
        body: opacityWrap(stackLogo("kosi", 620, 560, "#f4efe6"), 0.92),
        blend: "over",
      },
    ],
  },
  {
    id: "steel-water-bottle",
    base: "bottle",
    crop: { left: 0, top: 300, size: 1600 },
    layers: [
      {
        w: 240,
        h: 300,
        cx: 780,
        cy: 1180,
        body: stackLogo("northwind", 240, 300, INK, { iconScale: 0.5 }),
        blend: "multiply",
      },
    ],
  },
  {
    id: "branded-pens",
    base: "pens",
    crop: { left: 120, top: 0, size: 1067 },
    layers: [
      {
        w: 330,
        h: 46,
        cx: 712,
        cy: 488,
        angle: 36.6,
        body: rowLogo("leaf", 330, 46, "#f2f2f2"),
        blend: "over",
      },
    ],
  },
  {
    id: "printed-apron",
    base: "apron",
    crop: { left: 0, top: 700, size: 1600 },
    layers: [
      {
        w: 230,
        h: 190,
        cx: 555,
        cy: 1228,
        body: stackLogo("chai", 230, 190, INK, { sub: false, iconScale: 0.55 }),
        blend: "multiply",
      },
      {
        w: 240,
        h: 195,
        cx: 1142,
        cy: 1218,
        body: stackLogo("chai", 240, 195, INK, { sub: false, iconScale: 0.55 }),
        blend: "multiply",
      },
    ],
  },

  // ---------- Visiting Cards ----------
  {
    id: "matte-visiting-cards",
    base: "cardsMatte",
    crop: { left: 90, top: 0, size: 1067 },
    layers: [
      {
        w: 440,
        h: 300,
        cx: 474,
        cy: 652,
        angle: 42.2,
        body: stackLogo("northwind", 440, 300, INK, { iconScale: 0.36 }),
        blend: "multiply",
      },
      {
        w: 430,
        h: 280,
        cx: 785,
        cy: 423,
        angle: 39.8,
        body: cardBack("northwind", 430, 280, INK, { role: "Creative Director" }),
        blend: "multiply",
      },
    ],
  },
  {
    id: "glossy-visiting-cards",
    base: "cardsGlossy",
    crop: { left: 0, top: 680, size: 1600 },
    layers: [
      {
        w: 450,
        h: 790,
        cx: 638,
        cy: 1256,
        angle: 36.3,
        body: stackLogo("chai", 450, 790, "#6b2e12", { iconScale: 0.4 }),
        blend: "multiply",
      },
      {
        w: 455,
        h: 745,
        cx: 1023,
        cy: 1765,
        angle: 33,
        body: cardBack("chai", 455, 745, "#6b2e12", { person: "Rohan Verma", role: "Owner" }),
        blend: "multiply",
      },
      // A soft highlight across both cards: the glossy coat.
      {
        w: 470,
        h: 808,
        cx: 638,
        cy: 1256,
        angle: 36.3,
        body: `<rect width="470" height="808" fill="url(#sheen)"/>`,
        defs: `<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0.4"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset=".75" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
        blend: "screen",
      },
    ],
  },
  {
    id: "rounded-corner-visiting-cards",
    base: "cardsRounded",
    crop: { left: 266, top: 0, size: 1067 },
    rounded: {
      r: 30,
      rects: [
        [362, 232, 736, 477],
        [859, 242, 1234, 485],
        [363, 571, 736, 811],
        [862, 571, 1237, 813],
      ],
    },
    layers: [
      {
        w: 330,
        h: 220,
        cx: 549,
        cy: 355,
        body: stackLogo("leaf", 330, 220, "#2f5d3a", { iconScale: 0.38 }),
        blend: "multiply",
      },
      {
        w: 360,
        h: 230,
        cx: 1046,
        cy: 363,
        body: cardBack("leaf", 360, 230, "#2f5d3a", { person: "Meera Jha", role: "Weaver & Founder" }),
        blend: "multiply",
      },
      {
        w: 360,
        h: 230,
        cx: 549,
        cy: 691,
        body: cardBack("leaf", 360, 230, "#2f5d3a", { person: "Meera Jha", role: "Weaver & Founder" }),
        blend: "multiply",
      },
      {
        w: 330,
        h: 220,
        cx: 1049,
        cy: 692,
        body: stackLogo("leaf", 330, 220, "#2f5d3a", { iconScale: 0.38 }),
        blend: "multiply",
      },
    ],
  },
  {
    id: "textured-linen-visiting-cards",
    base: "cardsLinen",
    crop: { left: 250, top: 0, size: 1067 },
    layers: [
      {
        w: 900,
        h: 480,
        cx: 786,
        cy: 532,
        body: stackLogo("kosi", 900, 480, "#5b3a1e", { iconScale: 0.36 }),
        blend: "multiply",
      },
    ],
  },
  {
    id: "velvet-touch-visiting-cards",
    base: "cardsVelvet",
    crop: { left: 0, top: 700, size: 1600 },
    layers: [
      {
        w: 500,
        h: 920,
        origin: [232, 920],
        xVec: [530, 19],
        yVec: [69, 981],
        body: stackLogo("northwind", 500, 920, "#000", { fill: "url(#silver)", iconScale: 0.38 }),
        defs: SILVER,
        blend: "over",
      },
      {
        w: 430,
        h: 820,
        origin: [877, 947],
        xVec: [427, 15],
        yVec: [65, 874],
        body: cardBack("northwind", 430, 820, "#000", { fill: "url(#silver)", role: "Creative Director" }),
        defs: SILVER,
        blend: "over",
      },
    ],
  },
  {
    id: "spot-uv-visiting-cards",
    base: "cardsSpotUV",
    crop: { left: 0, top: 450, size: 1600 },
    layers: [
      {
        w: 880,
        h: 560,
        cx: 801,
        cy: 1245,
        angle: -23.8,
        body: stackLogo("chai", 880, 560, "#000", { fill: "url(#gloss)", iconScale: 0.42 }),
        defs: GLOSS,
        blend: "over",
      },
      {
        w: 880,
        h: 560,
        cx: 801,
        cy: 1245,
        angle: -23.8,
        body: `<g opacity=".55">${stackLogo("chai", 880, 560, "#fff", { iconScale: 0.42, fill: "url(#shine)" })}</g>`,
        defs: `<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".48" stop-color="#fff" stop-opacity=".7"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
        blend: "screen",
      },
    ],
  },
  {
    id: "gold-foil-visiting-cards",
    base: "cardsFoil",
    crop: { left: 0, top: 560, size: 1600 },
    layers: [
      {
        w: 560,
        h: 310,
        cx: 545,
        cy: 1046,
        body: stackLogo("saffron", 560, 310, "#000", { fill: "url(#gold)", iconScale: 0.42 }),
        defs: GOLD,
        blend: "over",
      },
      {
        w: 560,
        h: 315,
        cx: 1038,
        cy: 1568,
        body: cardBack("saffron", 560, 315, "#000", { fill: "url(#gold)", person: "Kavya Singh", role: "Partner" }),
        defs: GOLD,
        blend: "over",
      },
    ],
  },
  {
    id: "kraft-visiting-cards",
    base: "cardsKraft",
    crop: { left: 270, top: 0, size: 1067 },
    layers: [
      {
        w: 480,
        h: 280,
        cx: 805,
        cy: 296,
        body: stackLogo("leaf", 480, 280, KRAFT_INK, { iconScale: 0.4 }),
        blend: "multiply",
      },
      {
        w: 500,
        h: 285,
        cx: 801,
        cy: 690,
        body: cardBack("leaf", 500, 285, KRAFT_INK, { person: "Meera Jha", role: "Weaver & Founder" }),
        blend: "multiply",
      },
    ],
  },

  // ---------- Labels & Packaging ----------
  {
    id: "kraft-mailer-boxes",
    base: "mailer",
    crop: { left: 300, top: 0, size: 1067 },
    layers: [
      {
        w: 438,
        h: 426,
        origin: [872, 224],
        xVec: [392, 195],
        yVec: [-360, 227],
        body: stackLogo("leaf", 438, 426, KRAFT_INK, { iconScale: 0.34 }),
        blend: "multiply",
      },
    ],
  },
  {
    id: "printed-product-boxes",
    base: "productBox",
    crop: { left: 0, top: 640, size: 1600 },
    layers: [
      {
        w: 420,
        h: 495,
        cx: 710,
        cy: 1443,
        body: `<rect x="0" y="330" width="420" height="165" fill="#e9b86a"/>${stackLogo("kosi", 420, 330, "#5b3a1e", { iconScale: 0.34 })}<text x="210" y="425" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#5b3a1e">Butter Cookies</text>`,
        blend: "multiply",
      },
    ],
  },
  {
    id: "round-stickers",
    base: "stickers",
    crop: { left: 0, top: 700, size: 1600 },
    stickers: [
      { cx: 700, cy: 1780, d: 400, angle: -12, brand: "chai", text: "THANK YOU" },
      { cx: 1080, cy: 1520, d: 250, angle: 18, brand: "chai", text: "HANDMADE" },
      { cx: 420, cy: 900, d: 230, angle: -25, brand: "chai", text: "THANK YOU" },
    ],
    layers: [],
  },
  {
    id: "jar-bottle-labels",
    base: "jar",
    crop: { left: 0, top: 800, size: 1600 },
    layers: [
      {
        w: 340,
        h: 370,
        cx: 829,
        cy: 1556,
        body: `<rect x="14" y="14" width="312" height="342" rx="6" fill="none" stroke="#b5651d" stroke-width="3"/>${stackLogo("saffron", 340, 250, "#9a4b12", { iconScale: 0.38 })}<text x="170" y="275" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#9a4b12">Turmeric Powder</text><text x="170" y="318" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="18" letter-spacing="3" fill="#9a4b12">NET WT. 200 G</text>`,
        blend: "multiply",
      },
    ],
  },
  {
    id: "kraft-paper-carry-bags",
    base: "paperBag",
    crop: { left: 0, top: 450, size: 1600 },
    layers: [
      {
        w: 560,
        h: 520,
        cx: 762,
        cy: 1330,
        body: stackLogo("kosi", 560, 520, KRAFT_INK, { iconScale: 0.4 }),
        blend: "multiply",
      },
    ],
  },
  {
    id: "hang-tags",
    base: "hangTag",
    crop: { left: 0, top: 600, size: 1600 },
    layers: [
      {
        w: 414,
        h: 675,
        origin: [541, 1133],
        xVec: [414, -24],
        yVec: [51, 675],
        body: `${`<g transform="translate(0 120)">${stackLogo("leaf", 414, 380, KRAFT_INK, { iconScale: 0.36 })}</g>`}<text x="207" y="590" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" letter-spacing="5" fill="${KRAFT_INK}">100% COTTON</text>`,
        blend: "multiply",
      },
    ],
  },
  {
    id: "branded-packing-tape",
    base: "tape",
    crop: { left: 0, top: 400, size: 1600 },
    layers: [
      {
        // Runs over the lid and stops at its front edge, as sealing tape does.
        w: 1000,
        h: 230,
        cx: 1398,
        cy: 910,
        angle: -60.3,
        body: `<rect width="1000" height="230" fill="#c9a77a" fill-opacity=".55"/>${[0, 1, 2]
          .map(
            (i) =>
              `<g transform="translate(${40 + i * 330} 38)">${rowLogo("leaf", 280, 64, KRAFT_INK)}<text x="0" y="130" font-family="Segoe UI, Arial, sans-serif" font-size="24" letter-spacing="4" fill="${KRAFT_INK}">HANDLE WITH CARE</text></g>`,
          )
          .join(
            "",
          )}<rect y="0" width="1000" height="8" fill="#fff" fill-opacity=".35"/><rect y="222" width="1000" height="8" fill="#000" fill-opacity=".08"/>`,
        blend: "multiply",
      },
    ],
  },
  {
    id: "custom-tissue-paper",
    base: "tissue",
    crop: { left: 0, top: 380, size: 1600 },
    tissue: {
      polygon: "0,640 420,470 1000,500 1010,760 800,850 470,1150 0,1110",
      brand: "leaf",
    },
    layers: [],
  },
];

/* ------------------------------------------------------------------ */

const stickerLayer = async ({ cx, cy, d, angle, brand, text }) => {
  const r = d / 2;
  const body = `<circle cx="${r}" cy="${r}" r="${r - 2}" fill="#fff"/><circle cx="${r}" cy="${r}" r="${r * 0.9}" fill="#6b2e12"/>
    <g transform="translate(${r * 0.2} ${r * 0.18})">${stackLogo(brand, r * 1.6, r * 1.2, "#fff", { sub: false, iconScale: 0.5, fill: "#f6e7d4" })}</g>
    <text x="${r}" y="${r * 1.62}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="${r * 0.15}" letter-spacing="${r * 0.04}" fill="#f6e7d4">${text}</text>`;
  const shadow = {
    w: d,
    h: d,
    cx: cx + 6,
    cy: cy + 10,
    angle,
    body: `<circle cx="${r}" cy="${r}" r="${r - 4}" fill="#000" fill-opacity=".35"/>`,
    blur: 8,
    blend: "multiply",
  };
  const face = { w: d, h: d, cx, cy, angle, body, blend: "over" };
  return [shadow, face];
};

const tissueLayer = ({ polygon, brand }) => {
  const tile = 200;
  let marks = "";
  for (let y = 380; y < 1300; y += tile) {
    for (let x = -100; x < 1150; x += tile) {
      const offset = (Math.round(y / tile) % 2) * (tile / 2);
      marks += `<g transform="translate(${x + offset} ${y}) rotate(-18) scale(0.9)">${ICONS[BRANDS[brand].icon](KRAFT_INK)}</g>`;
    }
  }
  return {
    w: 1600,
    h: 2399,
    cx: 800,
    cy: 1199.5,
    body: `<clipPath id="t"><polygon points="${polygon}"/></clipPath><g clip-path="url(#t)" opacity=".42">${marks}</g>`,
    blend: "multiply",
  };
};

for (const mock of MOCKUPS) {
  const src = baseFile(mock.base);
  const layers = [...mock.layers];
  if (mock.stickers) for (const s of mock.stickers) layers.push(...(await stickerLayer(s)));
  if (mock.tissue) layers.push(tissueLayer(mock.tissue));

  const composites = [];
  if (mock.rounded) {
    for (const rect of mock.rounded.rects) composites.push(...(await roundedCornerPatches(src, rect, mock.rounded.r)));
  }
  for (const layer of layers) {
    const placed = await renderLayer(layer);
    composites.push({ ...placed, blend: layer.blend || "over" });
  }

  const merged = await sharp(src).composite(composites).toBuffer();
  const meta = await sharp(src).metadata();
  const { left, top } = mock.crop;
  // Never past the photo's edge (a few photos are a pixel or two short).
  const size = Math.min(mock.crop.size, meta.width - left, meta.height - top);
  await sharp(merged)
    .extract({ left, top, width: size, height: size })
    .resize(1200, 1200)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(outDir, `${mock.id}.jpg`));
  console.log("wrote", mock.id);
}
