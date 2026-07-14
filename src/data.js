export const navigationLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/customize", label: "Customize" },
  { to: "/cart", label: "Cart" },
];

export const promoMessage = "Buy more, save more on business cards, flyers, packaging, and event print essentials.";

export const utilityLinks = [
  { label: "Help Center", detail: "Mon-Sat support" },
  { label: "Bulk Orders", detail: "Custom quotes" },
  { label: "Saved Designs", detail: "Resume anytime" },
];

const optimizeImage = (src, width = 1400, height) =>
  `${src}?auto=compress&cs=tinysrgb&w=${width}${height ? `&h=${height}&fit=crop` : ""}`;

const createImageSet = (src) => [
  optimizeImage(src, 1400, 1120),
  optimizeImage(src, 1200, 900),
  optimizeImage(src, 1200, 960),
];

const stockImages = {
  hero: "https://images.pexels.com/photos/36412293/pexels-photo-36412293.jpeg",
  businessCards: "https://images.pexels.com/photos/8947634/pexels-photo-8947634.jpeg",
  flyers: "https://images.pexels.com/photos/17976191/pexels-photo-17976191.jpeg",
  packaging: "https://images.pexels.com/photos/8015700/pexels-photo-8015700.jpeg",
  tshirt: "https://images.pexels.com/photos/12025472/pexels-photo-12025472.jpeg",
  mug: "https://images.pexels.com/photos/3747162/pexels-photo-3747162.jpeg",
  invitations: "https://images.pexels.com/photos/28931796/pexels-photo-28931796.jpeg",
  notebook: "https://images.pexels.com/photos/6373455/pexels-photo-6373455.jpeg",
  banner: "https://images.pexels.com/photos/12883028/pexels-photo-12883028.jpeg",
};

export const homepageBanner = {
  src: optimizeImage(stockImages.hero, 1800, 1100),
  alt: "Print shop worker reviewing large-format prints at a professional printing press",
};

export const categories = [
  {
    id: "cards",
    title: "Visiting Cards",
    description: "Premium business cards with matte, foil, and soft-touch finishes.",
    image: optimizeImage(stockImages.businessCards, 900, 700),
    productId: "classic-card",
    searchCategory: "Visiting Cards",
  },
  {
    id: "marketing",
    title: "Marketing Materials",
    description: "Flyers, brochures, banners, and posters for promotions and launches.",
    image: optimizeImage(stockImages.flyers, 900, 700),
    productId: "launch-flyer",
    searchCategory: "Marketing Materials",
  },
  {
    id: "packaging",
    title: "Labels & Packaging",
    description: "Boxes, sleeves, labels, and inserts for modern product presentation.",
    image: optimizeImage(stockImages.packaging, 900, 700),
    productId: "mailer-box",
    searchCategory: "Labels & Packaging",
  },
  {
    id: "merch",
    title: "Clothing & Merchandise",
    description: "T-shirts, mugs, and branded gifts with print-ready customization.",
    image: optimizeImage(stockImages.tshirt, 900, 700),
    productId: "logo-tee",
    searchCategory: "Clothing & Merchandise",
  },
  {
    id: "photo-gifts",
    title: "Photo Gifts",
    description: "Personalized mugs and keepsakes for gifting, events, and office branding.",
    image: optimizeImage(stockImages.mug, 900, 700),
    productId: "photo-mug",
    searchCategory: "Photo Gifts",
  },
  {
    id: "invitations",
    title: "Invitations",
    description: "Elegant wedding and event stationery with layered cards and envelopes.",
    image: optimizeImage(stockImages.invitations, 900, 700),
    productId: "wedding-suite",
    searchCategory: "Invitations",
  },
  {
    id: "stationery",
    title: "Stationery",
    description: "Custom notebooks and office-ready print pieces for teams and studios.",
    image: optimizeImage(stockImages.notebook, 900, 700),
    productId: "studio-notebook",
    searchCategory: "Stationery",
  },
  {
    id: "banners",
    title: "Banners",
    description: "Large-format storefront and event banners designed for high visibility.",
    image: optimizeImage(stockImages.banner, 900, 700),
    productId: "storefront-banner",
    searchCategory: "Banners",
  },
];

export const categoryMenu = [
  { label: "Business Cards", category: "Visiting Cards" },
  { label: "Marketing", category: "Marketing Materials" },
  { label: "Packaging", category: "Labels & Packaging" },
  { label: "Merchandise", category: "Clothing & Merchandise" },
  { label: "Photo Gifts", category: "Photo Gifts" },
  { label: "Invitations", category: "Invitations" },
];

export const products = [
  {
    id: "classic-card",
    name: "Classic Visiting Card",
    price: 18,
    category: "Visiting Cards",
    description: "350 gsm premium stock with crisp business branding and optional rounded corners.",
    images: createImageSet(stockImages.businessCards),
    badge: "Best Seller",
    leadTime: "Ready in 3-5 days",
    materials: ["Matte", "Soft Touch", "Rounded Corners"],
    minimum: "MOQ 100",
    audience: "Small business essentials",
  },
  {
    id: "launch-flyer",
    name: "Launch Flyer Pack",
    price: 35,
    category: "Marketing Materials",
    description: "A5 flyer pack for campaigns, openings, and promotional drops.",
    images: createImageSet(stockImages.flyers),
    badge: "Campaign Favorite",
    leadTime: "Ready in 4-6 days",
    materials: ["170 gsm Art Paper", "Double-sided", "A5"],
    minimum: "MOQ 250",
    audience: "Retail promotions",
  },
  {
    id: "mailer-box",
    name: "Mailer Box Sleeve",
    price: 66,
    category: "Labels & Packaging",
    description: "Short-run branded sleeve for ecommerce packaging and launch kits.",
    images: createImageSet(stockImages.packaging),
    badge: "Premium Finish",
    leadTime: "Ready in 5-7 days",
    materials: ["Sleeves", "Labels", "Short-run packaging"],
    minimum: "MOQ 50",
    audience: "Ecommerce launches",
  },
  {
    id: "logo-tee",
    name: "Logo T-Shirt",
    price: 14,
    category: "Clothing & Merchandise",
    description: "Soft cotton tee with front chest print and back graphic support.",
    images: createImageSet(stockImages.tshirt),
    badge: "Team Pick",
    leadTime: "Ready in 5-7 days",
    materials: ["Cotton", "Front print", "Back print"],
    minimum: "MOQ 10",
    audience: "Staff uniforms and events",
  },
  {
    id: "photo-mug",
    name: "Custom Photo Mug",
    price: 9,
    category: "Photo Gifts",
    description: "Ceramic mug for event gifts, office branding, or personalized keepsakes.",
    images: createImageSet(stockImages.mug),
    badge: "Gift Ready",
    leadTime: "Ready in 3-4 days",
    materials: ["Ceramic", "Full-wrap print", "11 oz"],
    minimum: "MOQ 6",
    audience: "Corporate gifting",
  },
  {
    id: "wedding-suite",
    name: "Wedding Invitation Suite",
    price: 92,
    category: "Invitations",
    description: "Invitation, RSVP, and detail card bundle with layered premium stocks.",
    images: createImageSet(stockImages.invitations),
    badge: "Event Collection",
    leadTime: "Ready in 6-8 days",
    materials: ["Layered cards", "Envelope add-ons", "Foil options"],
    minimum: "MOQ 50",
    audience: "Weddings and celebrations",
  },
  {
    id: "studio-notebook",
    name: "Studio Notebook Set",
    price: 48,
    category: "Stationery",
    description: "Hardcover custom notebooks for teams, welcome kits, and premium office branding.",
    images: createImageSet(stockImages.notebook),
    badge: "Office Favorite",
    leadTime: "Ready in 4-6 days",
    materials: ["Hardcover", "Ruled pages", "Custom cover"],
    minimum: "MOQ 25",
    audience: "Brand kits and onboarding",
  },
  {
    id: "storefront-banner",
    name: "Storefront Banner",
    price: 79,
    category: "Banners",
    description: "Weather-ready vinyl banner for launches, sales, and storefront promotions.",
    images: createImageSet(stockImages.banner),
    badge: "Large Format",
    leadTime: "Ready in 4-6 days",
    materials: ["Vinyl", "Eyelets", "Outdoor-safe"],
    minimum: "MOQ 1",
    audience: "Storefront campaigns",
  },
];

export const trustHighlights = [
  { title: "Fast production", detail: "Turnaround options for urgent launches and event print runs." },
  { title: "Design assistance", detail: "Start from templates, upload your file, or hand work to a designer." },
  { title: "Business-ready quantities", detail: "From short runs to larger office and campaign orders." },
  { title: "Consistent support", detail: "Clear help paths for quotes, artwork checks, and repeat orders." },
];

export const businessEssentials = [
  {
    id: "starter-kit",
    title: "Business starter kit",
    description: "Visiting cards, flyers, notebooks, and branded merchandise for a polished launch.",
    ctaLabel: "Build your kit",
    ctaTo: "/products?category=Visiting%20Cards",
  },
  {
    id: "retail-promo",
    title: "Retail promotion set",
    description: "Banners, flyers, and packaging sleeves built for storefront promotions and seasonal sales.",
    ctaLabel: "Shop promotion print",
    ctaTo: "/products?category=Marketing%20Materials",
  },
];

export const inspirationLinks = [
  {
    id: "industry-templates",
    title: "Templates by industry",
    description: "Beauty, food, retail, studio, and event-ready layout ideas for faster customization.",
    to: "/customize",
  },
  {
    id: "logo-and-branding",
    title: "Branding help",
    description: "Logo-friendly products and coordinated print pieces to create a consistent visual identity.",
    to: "/customize",
  },
  {
    id: "bulk-orders",
    title: "Bulk order guidance",
    description: "Plan larger print runs with grouped products, quantities, and delivery expectations.",
    to: "/cart",
  },
];

