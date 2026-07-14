function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-ink-100 ${className}`.trim()} aria-hidden="true" />;
}

export default Skeleton;
