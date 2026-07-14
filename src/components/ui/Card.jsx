function Card({ as: Component = "div", className = "", padded = true, children, ...props }) {
  return (
    <Component
      className={`rounded-2xl border border-ink-100 bg-white shadow-xs ${padded ? "p-4 sm:p-5" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Card;
