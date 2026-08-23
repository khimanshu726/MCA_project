/**
 * Single source of truth for Elite Impressions' real business details (NAP —
 * name, address, phone — plus hours and socials). Used by the site footer and
 * the homepage LocalBusiness structured data so the two never drift apart, which
 * is what local search relies on.
 *
 * Everything here is real, provided by the business. Opening days are assumed
 * Monday–Saturday (hours were given as 10 AM–6 PM); adjust `openingDays` if the
 * shop keeps different days.
 */
export const BUSINESS = {
  name: "Elite Impressions",
  url: "https://eliteimpressions.co.in",
  email: "hello@elite-empressions.com",
  phone: "+919288675153",
  phoneDisplay: "+91 92886 75153",
  address: {
    street: "Bihar Press, Manjhili Chowk",
    locality: "Purnia",
    region: "Bihar",
    postalCode: "854301",
    country: "IN",
  },
  addressDisplay: "Bihar Press, Manjhili Chowk, Purnia, Bihar 854301",
  areaServed: "Purnia, Bihar",
  openingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  opens: "10:00",
  closes: "18:00",
  hoursDisplay: "Mon–Sat, 10 AM – 6 PM",
  instagram: "https://instagram.com/_elite_impressions_",
};
