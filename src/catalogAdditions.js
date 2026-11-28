/**
 * The November 2026 catalogue additions: eight products each for Visiting
 * Cards, Labels & Packaging and Clothing & Merchandise, modelled on what big
 * print shops offer. Added once to the live catalogue on deploy (see
 * ensureCatalogBatch in server/services/productMigration.js); after that the
 * owner edits or removes them in admin like any other product.
 *
 * Prices are per piece in ₹ and are starting suggestions. Images are branded
 * mockups built by scripts/buildCatalogMockups.mjs from free-licence (Pexels)
 * photos; the brands on them are invented samples.
 */
const image = (id) => [`/images/catalog/${id}.jpg`];

export const CATALOG_BATCH_ID = "catalog-2026-11";

export const catalogAdditions = [
  // ---------------------------------------------------------------- Visiting Cards
  {
    id: "matte-visiting-cards",
    name: "Matte Visiting Cards",
    category: "Visiting Cards",
    price: 4,
    priceTiers: [
      { minQty: 500, price: 3 },
      { minQty: 1000, price: 2 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "3-4",
    description:
      "Smooth, glare-free 300 gsm cards that take ink beautifully: the everyday choice for clean, readable business cards. Printed both sides in full colour.",
    materials: ["300 gsm", "Matte finish", "Double-sided", "3.5 × 2 in"],
    audience: "Every business",
    images: image("matte-visiting-cards"),
  },
  {
    id: "glossy-visiting-cards",
    name: "Glossy Visiting Cards",
    category: "Visiting Cards",
    price: 4,
    priceTiers: [
      { minQty: 500, price: 3 },
      { minQty: 1000, price: 2 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "3-4",
    description:
      "A light gloss coat makes colours and photos pop. Great for bright logos, salons, cafés and anything that should look vivid.",
    materials: ["300 gsm", "Gloss coat", "Double-sided", "3.5 × 2 in"],
    audience: "Bright, colourful brands",
    images: image("glossy-visiting-cards"),
  },
  {
    id: "rounded-corner-visiting-cards",
    name: "Rounded Corner Visiting Cards",
    category: "Visiting Cards",
    price: 6,
    priceTiers: [
      { minQty: 500, price: 5 },
      { minQty: 1000, price: 4 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "4-5",
    description:
      "Soft rounded corners give a friendly, modern feel and stop cards dog-earing in a wallet. Matte 350 gsm stock.",
    materials: ["350 gsm", "Rounded corners", "Matte finish", "Double-sided"],
    audience: "Boutiques and creative brands",
    images: image("rounded-corner-visiting-cards"),
  },
  {
    id: "textured-linen-visiting-cards",
    name: "Textured Linen Visiting Cards",
    category: "Visiting Cards",
    price: 9,
    priceTiers: [
      { minQty: 500, price: 8 },
      { minQty: 1000, price: 7 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "5-6",
    description:
      "Premium textured stock with a fine woven feel you notice the moment you hold it. Ideal for bakeries, boutiques and professional services.",
    materials: ["Textured linen stock", "Off-white", "Single or double-sided"],
    audience: "Premium, crafted brands",
    images: image("textured-linen-visiting-cards"),
  },
  {
    id: "velvet-touch-visiting-cards",
    name: "Velvet Touch Visiting Cards",
    category: "Visiting Cards",
    price: 12,
    priceTiers: [
      { minQty: 500, price: 10 },
      { minQty: 1000, price: 9 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "5-6",
    description:
      "Thick cards with a soft-touch lamination that feels like velvet. Looks especially rich on black with a silver or white print.",
    materials: ["400 gsm", "Soft-touch lamination", "Black or white stock"],
    audience: "Studios and consultants",
    images: image("velvet-touch-visiting-cards"),
  },
  {
    id: "spot-uv-visiting-cards",
    name: "Spot UV Visiting Cards",
    category: "Visiting Cards",
    price: 14,
    priceTiers: [
      { minQty: 500, price: 12 },
      { minQty: 1000, price: 10 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "6-7",
    description:
      "A matte card with a raised, glossy logo that catches the light. The classic premium effect on black or dark stock.",
    materials: ["400 gsm", "Matte lamination", "Raised spot UV logo"],
    audience: "Premium brands",
    images: image("spot-uv-visiting-cards"),
  },
  {
    id: "gold-foil-visiting-cards",
    name: "Gold Foil Visiting Cards",
    category: "Visiting Cards",
    price: 15,
    priceTiers: [
      { minQty: 500, price: 13 },
      { minQty: 1000, price: 11 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "6-7",
    description:
      "Real metallic gold foil on deep navy or black stock. Made for jewellers, wedding planners and brands that want a lasting first impression.",
    materials: ["400 gsm", "Gold foil", "Silver or rose gold on request"],
    audience: "Luxury and wedding businesses",
    images: image("gold-foil-visiting-cards"),
  },
  {
    id: "kraft-visiting-cards",
    name: "Kraft Visiting Cards",
    category: "Visiting Cards",
    price: 7,
    priceTiers: [
      { minQty: 500, price: 6 },
      { minQty: 1000, price: 5 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "4-5",
    description:
      "Natural brown kraft board with a warm, handmade look. Perfect for organic, eco-friendly and handcrafted brands.",
    materials: ["350 gsm kraft", "Dark ink", "Recyclable"],
    audience: "Eco and handmade brands",
    images: image("kraft-visiting-cards"),
  },

  // ---------------------------------------------------------- Labels & Packaging
  {
    id: "kraft-mailer-boxes",
    name: "Kraft Mailer Boxes",
    category: "Labels & Packaging",
    price: 45,
    priceTiers: [
      { minQty: 200, price: 40 },
      { minQty: 500, price: 34 },
    ],
    minimumOrderQty: 50,
    quantityStep: 50,
    leadTime: "7-8",
    description:
      "Sturdy corrugated mailer boxes with your logo printed on the lid. Self-locking, strong enough to ship, and a great unboxing moment.",
    materials: ["E-flute corrugated", "Kraft brown", "Lid print", "Custom sizes"],
    audience: "Online stores and gift boxes",
    images: image("kraft-mailer-boxes"),
  },
  {
    id: "printed-product-boxes",
    name: "Printed Product Boxes",
    category: "Labels & Packaging",
    price: 22,
    priceTiers: [
      { minQty: 500, price: 18 },
      { minQty: 1000, price: 15 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "7-8",
    description:
      "Folding cartons printed in full colour for sweets, cosmetics, candles and small products. Made to your size, delivered flat.",
    materials: ["350 gsm board", "Full colour", "Matte or gloss", "Custom sizes"],
    audience: "Food, beauty and retail products",
    images: image("printed-product-boxes"),
  },
  {
    id: "round-stickers",
    name: "Round Stickers",
    category: "Labels & Packaging",
    price: 2,
    priceTiers: [{ minQty: 2000, price: 1 }],
    minimumOrderQty: 500,
    quantityStep: 500,
    leadTime: "3-4",
    description:
      "Round logo stickers to seal boxes, bags and envelopes, or to say thank you. Glossy vinyl or paper, cut to shape.",
    materials: ["Gloss vinyl or paper", "2 or 3 in round", "Kiss-cut sheets"],
    audience: "Packaging and giveaways",
    images: image("round-stickers"),
  },
  {
    id: "jar-bottle-labels",
    name: "Jar & Bottle Labels",
    category: "Labels & Packaging",
    price: 3,
    priceTiers: [{ minQty: 1000, price: 2 }],
    minimumOrderQty: 500,
    quantityStep: 500,
    leadTime: "4-5",
    description:
      "Product labels for jars, bottles and tins: spices, pickles, honey, oils and cosmetics. Waterproof options for the kitchen and the bathroom.",
    materials: ["Paper or waterproof vinyl", "Custom size", "Roll or sheets"],
    audience: "Home food and cosmetic brands",
    images: image("jar-bottle-labels"),
  },
  {
    id: "kraft-paper-carry-bags",
    name: "Kraft Paper Carry Bags",
    category: "Labels & Packaging",
    price: 28,
    priceTiers: [
      { minQty: 500, price: 24 },
      { minQty: 1000, price: 21 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "6-7",
    description:
      "Strong brown paper bags with handles and your logo printed on the front. A plastic-free carry bag for shops, bakeries and events.",
    materials: ["120 gsm kraft", "Flat or twisted handles", "1-colour print"],
    audience: "Shops, bakeries and cafés",
    images: image("kraft-paper-carry-bags"),
  },
  {
    id: "hang-tags",
    name: "Hang Tags",
    category: "Labels & Packaging",
    price: 4,
    priceTiers: [{ minQty: 1000, price: 3 }],
    minimumOrderQty: 200,
    quantityStep: 100,
    leadTime: "4-5",
    description:
      "Swing tags for clothing, gifts and handmade products, with a punched hole and string. Print your logo, price or care details.",
    materials: ["350 gsm kraft or white", "Punched hole", "String included"],
    audience: "Clothing and handmade products",
    images: image("hang-tags"),
  },
  {
    id: "branded-packing-tape",
    name: "Branded Packing Tape",
    category: "Labels & Packaging",
    price: 180,
    priceTiers: [{ minQty: 48, price: 160 }],
    minimumOrderQty: 12,
    quantityStep: 12,
    leadTime: "8-10",
    description:
      "Packing tape printed with your logo and message, so every parcel is branded the moment it is sealed. 48 mm wide, 65 m rolls.",
    materials: ["48 mm × 65 m", "Brown or clear", "1-colour print"],
    audience: "Online stores and warehouses",
    images: image("branded-packing-tape"),
  },
  {
    id: "custom-tissue-paper",
    name: "Custom Tissue Paper",
    category: "Labels & Packaging",
    price: 12,
    priceTiers: [{ minQty: 500, price: 10 }],
    minimumOrderQty: 200,
    quantityStep: 100,
    leadTime: "8-10",
    description:
      "Thin wrapping tissue printed with a repeating logo pattern, for clothing, gifts and boxes that feel special to open.",
    materials: ["17 gsm tissue", "Repeat pattern print", "50 × 70 cm sheets"],
    audience: "Fashion and gift brands",
    images: image("custom-tissue-paper"),
  },

  // ---------------------------------------------------- Clothing & Merchandise
  {
    id: "round-neck-tshirt",
    name: "Round Neck T-Shirt",
    category: "Clothing & Merchandise",
    price: 299,
    priceTiers: [
      { minQty: 25, price: 269 },
      { minQty: 50, price: 249 },
    ],
    minimumOrderQty: 10,
    quantityStep: 5,
    leadTime: "5-7",
    description:
      "Soft 180 gsm cotton tees with your logo or artwork printed on the front, back or both. For teams, events, cafés and merch drops.",
    materials: ["100% cotton", "180 gsm", "S to XXL", "Front and back print"],
    audience: "Teams, events and merch",
    images: image("round-neck-tshirt"),
  },
  {
    id: "polo-tshirt",
    name: "Polo T-Shirt with Embroidered Logo",
    category: "Clothing & Merchandise",
    price: 449,
    priceTiers: [
      { minQty: 25, price: 419 },
      { minQty: 50, price: 389 },
    ],
    minimumOrderQty: 10,
    quantityStep: 5,
    leadTime: "7-8",
    description:
      "Smart pique polos with a neat embroidered logo on the chest. The go-to uniform for staff, reception and field teams.",
    materials: ["Cotton-blend pique", "Embroidered chest logo", "Many colours", "S to XXL"],
    audience: "Staff uniforms",
    images: image("polo-tshirt"),
  },
  {
    id: "printed-hoodie",
    name: "Printed Hoodie",
    category: "Clothing & Merchandise",
    price: 799,
    priceTiers: [{ minQty: 25, price: 739 }],
    minimumOrderQty: 10,
    quantityStep: 5,
    leadTime: "7-8",
    description:
      "Warm fleece-lined hoodies with a large back print and an optional small front logo. Popular for colleges, clubs and winter merch.",
    materials: ["Cotton-poly fleece", "320 gsm", "Back and front print"],
    audience: "Colleges, clubs and teams",
    images: image("printed-hoodie"),
  },
  {
    id: "embroidered-cap",
    name: "Embroidered Cap",
    category: "Clothing & Merchandise",
    price: 249,
    priceTiers: [{ minQty: 50, price: 219 }],
    minimumOrderQty: 20,
    quantityStep: 10,
    leadTime: "6-7",
    description:
      "Adjustable caps with your logo embroidered on the front panel. For staff, events, sports teams and promotions.",
    materials: ["Cotton twill or trucker mesh", "Adjustable strap", "Front embroidery"],
    audience: "Events and staff",
    images: image("embroidered-cap"),
  },
  {
    id: "canvas-tote-bag",
    name: "Canvas Tote Bag",
    category: "Clothing & Merchandise",
    price: 149,
    priceTiers: [
      { minQty: 100, price: 129 },
      { minQty: 250, price: 115 },
    ],
    minimumOrderQty: 25,
    quantityStep: 25,
    leadTime: "6-7",
    description:
      "Reusable cotton canvas totes printed with your logo: a gift people actually carry. Natural or black canvas.",
    materials: ["Cotton canvas", "Natural or black", "38 × 42 cm"],
    audience: "Shops, events and giveaways",
    images: image("canvas-tote-bag"),
  },
  {
    id: "steel-water-bottle",
    name: "Steel Water Bottle",
    category: "Clothing & Merchandise",
    price: 399,
    priceTiers: [{ minQty: 100, price: 359 }],
    minimumOrderQty: 25,
    quantityStep: 25,
    leadTime: "7-8",
    description:
      "750 ml metal bottles with a carabiner cap and your logo printed or engraved. Corporate gifts, school events and sports teams.",
    materials: ["750 ml", "Aluminium or steel", "Print or engraving"],
    audience: "Corporate gifts",
    images: image("steel-water-bottle"),
  },
  {
    id: "branded-pens",
    name: "Branded Metal Pens",
    category: "Clothing & Merchandise",
    price: 25,
    priceTiers: [
      { minQty: 500, price: 21 },
      { minQty: 1000, price: 18 },
    ],
    minimumOrderQty: 100,
    quantityStep: 100,
    leadTime: "5-6",
    description:
      "Smooth-writing metal ballpoint pens with your name or logo printed along the barrel. Ideal for clinics, offices, seminars and hotels.",
    materials: ["Metal barrel", "Blue ink", "Laser or print branding"],
    audience: "Offices, clinics and hotels",
    images: image("branded-pens"),
  },
  {
    id: "printed-apron",
    name: "Printed Apron",
    category: "Clothing & Merchandise",
    price: 349,
    priceTiers: [{ minQty: 25, price: 319 }],
    minimumOrderQty: 10,
    quantityStep: 5,
    leadTime: "6-7",
    description:
      "Durable canvas aprons with adjustable straps, a front pocket and your logo on the bib. For cafés, bakeries, salons and kitchens.",
    materials: ["Cotton canvas", "Adjustable neck strap", "Front pocket", "Logo on bib"],
    audience: "Cafés, bakeries and salons",
    images: image("printed-apron"),
  },
];
