/*
 * No icon imports here on purpose.
 *
 * The first version of this file imported Instagram/Youtube/Twitter/Linkedin/
 * Facebook from lucide-react. Those brand glyphs were removed from the library
 * (this project is on v1.23, which ships only generic icons), so the named
 * imports resolved to nothing and took the whole module graph down with them —
 * SiteFooter is rendered by AppLayout, so every page went blank.
 *
 * The unit suite did not catch it: no social URL is configured, so the icon
 * component was never rendered and the broken binding was never touched. Only
 * loading the actual page surfaced it.
 *
 * Platforms are therefore identified by name rather than by a brand mark. It
 * renders correctly on the installed library, reads unambiguously for screen
 * readers, and if you later want real brand glyphs they drop into the `Icon`
 * slot in SiteFooter without touching this file.
 */

/**
 * Social profiles, read from the environment rather than hardcoded.
 *
 * These were four `href="#"` placeholders: they looked like working buttons,
 * consumed a click, and did nothing. A dead control is worse than an absent
 * one — it costs the customer a click to learn it was never real, and it makes
 * the whole footer look unfinished.
 *
 * So a profile appears only once its URL is actually configured. With none
 * set, the row is not rendered at all. Set the ones you have and they show up;
 * no code change needed, and no placeholder ever ships.
 *
 * Configure in `.env` (VITE_ vars are inlined at build time, so a production
 * build needs them present in the build environment):
 *
 *   VITE_SOCIAL_INSTAGRAM=https://instagram.com/your-handle
 *   VITE_SOCIAL_YOUTUBE=https://youtube.com/@your-channel
 *   VITE_SOCIAL_TWITTER=https://x.com/your-handle
 *   VITE_SOCIAL_LINKEDIN=https://linkedin.com/company/your-company
 *   VITE_SOCIAL_FACEBOOK=https://facebook.com/your-page
 */

const SOCIAL_PROFILES = [
  { id: "instagram", label: "Instagram", url: import.meta.env.VITE_SOCIAL_INSTAGRAM },
  { id: "youtube", label: "YouTube", url: import.meta.env.VITE_SOCIAL_YOUTUBE },
  { id: "twitter", label: "X", url: import.meta.env.VITE_SOCIAL_TWITTER },
  { id: "linkedin", label: "LinkedIn", url: import.meta.env.VITE_SOCIAL_LINKEDIN },
  { id: "facebook", label: "Facebook", url: import.meta.env.VITE_SOCIAL_FACEBOOK },
];

/**
 * Only absolute http(s) URLs are accepted. An unset Vite variable compiles to
 * the string "undefined" rather than being absent, and a half-filled value
 * like "instagram.com/x" would resolve as a relative path inside the app —
 * both would render as a link that goes somewhere wrong rather than nowhere.
 */
const isUsableUrl = (value) => {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null" || trimmed === "#") {
    return false;
  }

  try {
    const { protocol } = new URL(trimmed);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
};

export const getConfiguredSocialLinks = () =>
  SOCIAL_PROFILES.filter((profile) => isUsableUrl(profile.url)).map((profile) => ({
    ...profile,
    url: profile.url.trim(),
  }));

export const __testing = { isUsableUrl, SOCIAL_PROFILES };
