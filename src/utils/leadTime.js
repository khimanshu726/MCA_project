/**
 * How long an order takes to be ready, as customers read it.
 *
 * Admins type lead time freely: some as a phrase ("Ready in 3-5 days"), some
 * as just the days ("6", "4-5", "6 days"). A bare number on a product card
 * means nothing to a customer, so day counts are written out; anything else is
 * shown as typed. Shared by the storefront and the admin form's preview.
 */
const DAYS_ONLY = /^(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(?:working\s+)?(?:days?)?$/i;

export const formatLeadTime = (value) => {
  const text = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!text) return "";
  const match = text.match(DAYS_ONLY);
  if (!match) return text;
  const [, from, to] = match;
  if (to && to !== from) return `Ready in ${from}-${to} days`;
  return Number(from) === 1 ? "Ready in 1 day" : `Ready in ${from} days`;
};
