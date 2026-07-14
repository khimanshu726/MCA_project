import { forwardRef } from "react";

const VARIANT_CLASSES = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 focus-visible:outline-brand-500 shadow-sm",
  secondary:
    "bg-white text-ink-900 border border-ink-200 hover:border-brand-400 hover:text-brand-600 focus-visible:outline-brand-500",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100 focus-visible:outline-ink-400",
  danger: "bg-danger-500 text-white hover:bg-danger-600 focus-visible:outline-danger-500",
  text: "bg-transparent text-ink-600 hover:text-brand-600 underline-offset-4 hover:underline px-0 h-auto",
};

const SIZE_CLASSES = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

const Button = forwardRef(function Button(
  { as: Component = "button", variant = "primary", size = "md", loading = false, className = "", disabled, children, ...props },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <Component
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`.trim()}
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
