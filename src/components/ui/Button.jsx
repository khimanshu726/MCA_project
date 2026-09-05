import { forwardRef } from "react";

// Matches the storefront's custom-CSS buttons (.primary/.secondary/.ghost) so
// every CTA reads as one family: editorial ink pill primary, terracotta stays an
// accent (links/highlights), not the button fill.
const VARIANT_CLASSES = {
  // text-white! (important) so the label wins over the unlayered `a { color:
  // inherit }` reset when this Button is rendered as a link on a dark fill.
  primary:
    "bg-ink-950 text-white! shadow-sm hover:bg-ink-800 hover:-translate-y-px hover:shadow-md disabled:hover:translate-y-0 disabled:hover:shadow-sm focus-visible:outline-ink-900",
  secondary:
    "bg-white text-ink-900 border border-ink-200 hover:border-ink-900 hover:-translate-y-px disabled:hover:translate-y-0 focus-visible:outline-ink-900",
  ghost: "bg-transparent text-ink-800 hover:bg-ink-100 focus-visible:outline-ink-400",
  danger:
    "bg-danger-500 text-white! hover:bg-danger-600 hover:-translate-y-px disabled:hover:translate-y-0 focus-visible:outline-danger-500",
  text: "bg-transparent text-ink-600 hover:text-brand-600 underline-offset-4 hover:underline px-0 h-auto",
};

const SIZE_CLASSES = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-7 text-base",
};

const Button = forwardRef(function Button(
  { as: Component = "button", variant = "primary", size = "md", loading = false, className = "", disabled, children, ...props },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <Component
      ref={ref}
      className={`ui-button inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-all duration-200 ease-out active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`.trim()}
      disabled={Component === "button" ? isDisabled : undefined}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : null}
      {children}
    </Component>
  );
});

export default Button;
