export const navigationLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/customize", label: "Customize" },
  { to: "/cart", label: "Cart" },
  { to: "/admin/login", label: "Admin" },
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
  },
  {
    id: "marketing",
    title: "Marketing Materials",
    description: "Flyers, brochures, banners, and posters for promotions and launches.",
    image: optimizeImage(stockImages.flyers, 900, 700),
    productId: "launch-flyer",
  },
  {
    id: "packaging",
    title: "Labels & Packaging",
    description: "Boxes, sleeves, labels, and inserts for modern product presentation.",
    image: optimizeImage(stockImages.packaging, 900, 700),
    productId: "mailer-box",
  },
  {
    id: "merch",
    title: "Clothing & Merchandise",
    description: "T-shirts, mugs, and branded gifts with print-ready customization.",
    image: optimizeImage(stockImages.tshirt, 900, 700),
    productId: "logo-tee",
  },
  {
    id: "photo-gifts",
    title: "Photo Gifts",
    description: "Personalized mugs and keepsakes for gifting, events, and office branding.",
    image: optimizeImage(stockImages.mug, 900, 700),
    productId: "photo-mug",
  },
  {
    id: "invitations",
    title: "Invitations",
    description: "Elegant wedding and event stationery with layered cards and envelopes.",
    image: optimizeImage(stockImages.invitations, 900, 700),
    productId: "wedding-suite",
  },
  {
    id: "stationery",
    title: "Stationery",
    description: "Custom notebooks and office-ready print pieces for teams and studios.",
    image: optimizeImage(stockImages.notebook, 900, 700),
    productId: "studio-notebook",
  },
  {
    id: "banners",
    title: "Banners",
    description: "Large-format storefront and event banners designed for high visibility.",
    image: optimizeImage(stockImages.banner, 900, 700),
    productId: "storefront-banner",
  },
];

export const products = [
  {
    id: "classic-card",
    name: "Classic Visiting Card",
    price: 18,
    category: "Visiting Cards",
    description: "350 gsm premium stock with crisp business branding and optional rounded corners.",
    images: createImageSet(stockImages.businessCards),
  },
  {
    id: "launch-flyer",
    name: "Launch Flyer Pack",
    price: 35,
    category: "Marketing Materials",
    description: "A5 flyer pack for campaigns, openings, and promotional drops.",
    images: createImageSet(stockImages.flyers),
  },
  {
    id: "mailer-box",
    name: "Mailer Box Sleeve",
    price: 66,
    category: "Labels & Packaging",
    description: "Short-run branded sleeve for ecommerce packaging and launch kits.",
    images: createImageSet(stockImages.packaging),
  },
  {
    id: "logo-tee",
    name: "Logo T-Shirt",
    price: 14,
    category: "Clothing & Merchandise",
    description: "Soft cotton tee with front chest print and back graphic support.",
    images: createImageSet(stockImages.tshirt),
  },
  {
    id: "photo-mug",
    name: "Custom Photo Mug",
    price: 9,
    category: "Photo Gifts",
    description: "Ceramic mug for event gifts, office branding, or personalized keepsakes.",
    images: createImageSet(stockImages.mug),
  },
  {
    id: "wedding-suite",
    name: "Wedding Invitation Suite",
    price: 92,
    category: "Invitations",
    description: "Invitation, RSVP, and detail card bundle with layered premium stocks.",
    images: createImageSet(stockImages.invitations),
  },
  {
    id: "studio-notebook",
    name: "Studio Notebook Set",
    price: 48,
    category: "Stationery",
    description: "Hardcover custom notebooks for teams, welcome kits, and premium office branding.",
    images: createImageSet(stockImages.notebook),
  },
  {
    id: "storefront-banner",
    name: "Storefront Banner",
    price: 79,
    category: "Banners",
    description: "Weather-ready vinyl banner for launches, sales, and storefront promotions.",
    images: createImageSet(stockImages.banner),
  },
];

export const getProductById = (productId) => products.find((product) => product.id === productId);
