import bannerImage from "./assets/images/banner-print-shop.svg";
import categoryCards from "./assets/images/category-cards.svg";
import categoryFlyers from "./assets/images/category-flyers.svg";
import categoryPackaging from "./assets/images/category-packaging.svg";
import categoryMerch from "./assets/images/category-merch.svg";

export const navigationLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/customize", label: "Customize" },
  { to: "/cart", label: "Cart" },
];

export const homepageBanner = {
  src: bannerImage,
  alt: "Print shop desk with colorful print samples, packaging, and design layouts",
};

export const categories = [
  {
    id: "cards",
    title: "Visiting Cards",
    description: "Premium business cards with matte, foil, and soft-touch finishes.",
    image: categoryCards,
  },
  {
    id: "marketing",
    title: "Marketing Materials",
    description: "Flyers, brochures, banners, and posters for promotions and launches.",
    image: categoryFlyers,
  },
  {
    id: "packaging",
    title: "Labels & Packaging",
    description: "Boxes, sleeves, labels, and inserts for modern product presentation.",
    image: categoryPackaging,
  },
  {
    id: "merch",
    title: "Clothing & Merchandise",
    description: "T-shirts, mugs, and branded gifts with print-ready customization.",
    image: categoryMerch,
  },
];

export const products = [
  {
    id: "classic-card",
    name: "Classic Visiting Card",
    price: 18,
    category: "Visiting Cards",
    description: "350 gsm premium stock with crisp business branding and optional rounded corners.",
    images: [
      "/images/products/classic-card-front.svg",
      "/images/products/classic-card-stack.svg",
      "/images/products/classic-card-detail.svg",
    ],
  },
  {
    id: "launch-flyer",
    name: "Launch Flyer Pack",
    price: 35,
    category: "Marketing Materials",
    description: "A5 flyer pack for campaigns, openings, and promotional drops.",
    images: [
      "/images/products/flyer-cover.svg",
      "/images/products/flyer-stack.svg",
      "/images/products/flyer-board.svg",
    ],
  },
  {
    id: "mailer-box",
    name: "Mailer Box Sleeve",
    price: 66,
    category: "Labels & Packaging",
    description: "Short-run branded sleeve for ecommerce packaging and launch kits.",
    images: [
      "/images/products/box-sleeve-main.svg",
      "/images/products/box-sleeve-open.svg",
      "/images/products/box-sleeve-label.svg",
    ],
  },
  {
    id: "logo-tee",
    name: "Logo T-Shirt",
    price: 14,
    category: "Clothing & Merchandise",
    description: "Soft cotton tee with front chest print and back graphic support.",
    images: [
      "/images/products/tshirt-front.svg",
      "/images/products/tshirt-back.svg",
      "/images/products/tshirt-detail.svg",
    ],
  },
  {
    id: "photo-mug",
    name: "Custom Photo Mug",
    price: 9,
    category: "Photo Gifts",
    description: "Ceramic mug for event gifts, office branding, or personalized keepsakes.",
    images: [
      "/images/products/mug-main.svg",
      "/images/products/mug-side.svg",
      "/images/products/mug-box.svg",
    ],
  },
  {
    id: "wedding-suite",
    name: "Wedding Invitation Suite",
    price: 92,
    category: "Invitations",
    description: "Invitation, RSVP, and detail card bundle with layered premium stocks.",
    images: [
      "/images/products/invite-main.svg",
      "/images/products/invite-flatlay.svg",
      "/images/products/invite-envelope.svg",
    ],
  },
];

export const getProductById = (productId) => products.find((product) => product.id === productId);
