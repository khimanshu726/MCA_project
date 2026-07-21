/**
 * Static term suggestions for the header search dropdown. These are search
 * *terms* (they route to /products?q=…), not product ids — the live product
 * suggestions come from the catalog itself.
 */

// Shown when the search box is focused but empty (and there are no recents to
// show, or alongside them). Kept to the storefront's real catalogue language.
export const POPULAR_SEARCHES = [
  "Business Cards",
  "Wedding Cards",
  "T-Shirts",
  "Banners",
  "Flyers",
  "Packaging",
  "Photo Frames",
  "Coffee Mugs",
];

// Offered in the empty state when a query matches nothing, as a way back to
// something that will.
export const EMPTY_STATE_SUGGESTIONS = ["Business Cards", "Flyers", "Packaging", "Banners"];
