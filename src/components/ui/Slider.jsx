import { forwardRef } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../../lib/cn.js";

/**
 * 21st.dev / shadcn-style range slider (Radix primitive), themed to the studio
 * tokens. Deliberately renders inline — no portal — so it never crosses a panel
 * boundary, keeping the studio's overlay-ownership discipline intact.
 *
 * Scalar API on top of Radix's array model: pass a single number, receive a
 * single number. `onValueChange` fires continuously during a drag (use for
 * transient/live updates); `onValueCommit` fires once on release or keyboard
 * commit (use to close an undo transaction). `onPointerDown` is forwarded so a
 * caller can open the transaction at drag start.
 */
const Slider = forwardRef(function Slider(
  { value, defaultValue, onValueChange, onValueCommit, min = 0, max = 100, step = 1, className, ...props },
  ref,
) {
  const toArray = (v) => (v === undefined ? undefined : [v]);
  const fromArray = (fn) => (fn ? (arr) => fn(arr[0]) : undefined);

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex h-5 w-full touch-none select-none items-center", className)}
      value={toArray(value)}
      defaultValue={toArray(defaultValue)}
      onValueChange={fromArray(onValueChange)}
      onValueCommit={fromArray(onValueCommit)}
      min={min}
      max={max}
      step={step}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-ink-200">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-brand-500" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block size-4 rounded-full border border-ink-200 bg-white shadow-panel outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95"
        aria-label="Value"
      />
    </SliderPrimitive.Root>
  );
});

export default Slider;
