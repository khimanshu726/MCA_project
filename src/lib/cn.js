import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-name merge helper used by the studio's 21st.dev / shadcn-style
 * components: `clsx` resolves conditionals, `twMerge` de-duplicates conflicting
 * Tailwind utilities so a caller's override always wins over a base class.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
