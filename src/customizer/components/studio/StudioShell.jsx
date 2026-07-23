/**
 * Studio layout. Pure structure, zero logic — every responsive decision for
 * the workspace lives here, in one file.
 *
 * ── Overlay ownership ──────────────────────────────────────────────────
 * Every floating element renders inside the zone that owns it, positioned
 * `absolute` against that zone. Nothing in the studio portals to
 * document.body or uses position:fixed, because an element anchored to the
 * viewport has no layout owner and will eventually land on the canvas —
 * that is exactly how the product dropdown ended up across the artboard.
 *
 *   Navigation  → no overlays at all. Tool labels render inline, which is
 *                 why the sidebar is labelled rather than an icon rail: a
 *                 tooltip on a left-edge rail can only open rightwards,
 *                 into the workspace.
 *   Canvas      → editing affordances only: selection frame, crop bar,
 *                 snap guides, rulers, view controls.
 *   Inspector   → its own popovers and views (product picker, option
 *                 listboxes), which swap or stack inside the panel.
 *   App bar     → no visual tooltips; the bar is 56px, so a tip below a
 *                 button would leave the zone.
 *
 * Dialogs (preview, print-readiness) are the deliberate exception: a modal
 * is meant to take the whole viewport and is dismissible.
 * ───────────────────────────────────────────────────────────────────────
 *
 * The shell claims the whole viewport (`h-dvh`) and sizes its rows by
 * flex, never by subtracting a measured chrome height. The previous
 * `calc(100dvh - 150px)` guessed at the storefront promo strip + header and
 * guessed wrong (they measure 206px), so the editor overflowed into the
 * footer. `dvh` (not `vh`) so the iOS URL bar can't crop the bottom row.
 *
 * Surfaces separate by value, not by stroke: the workspace backdrop is
 * ink-100 and the chrome is white, so borders would be invisible anyway.
 * Chrome is square and flush to the viewport; only floating things (view
 * controls, dialogs, sheets) get a radius.
 */
function StudioShell({ appBar, rail, panel, canvas, inspector, statusBar, sheet }) {
  return (
    // studio-scope opts this subtree into the scoped form-control reset in
    // tailwind.css — the storefront keeps its own control styling.
    <div
      className="studio-scope flex h-dvh flex-col overflow-hidden bg-ink-100"
      // Landscape notches sit on the left/right edge — inset the whole studio
      // from them. env() resolves to 0 everywhere there's no inset (desktop),
      // so this is a no-op off-device.
      style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      {/* App bar grows by the top safe-area inset (notch / status bar) so its
          controls never sit under system UI. Height is 3.5rem + inset, padded
          down by the inset; on desktop that's exactly 3.5rem (h-14). */}
      <header
        className="z-20 flex shrink-0 items-center border-b border-ink-100 bg-white px-3"
        style={{ height: "calc(3.5rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}
      >
        {appBar}
      </header>

      <div className="flex min-h-0 flex-1 flex-row">
        {/* Rail + drawer: a fixed bottom tool bar on mobile (see below), a
            vertical rail beside the canvas from lg up. */}
        <div className="z-10 hidden shrink-0 flex-row lg:flex">
          {rail}
          {panel}
        </div>

        <main className="relative min-w-0 flex-1">{canvas}</main>

        <div className="hidden shrink-0 lg:flex">{inspector}</div>
      </div>

      {/* Mobile: one sheet serves both panel and inspector, over the canvas. */}
      <div className="lg:hidden">{sheet}</div>

      {/* Mobile tool toolbar: taller than the app bar so the labelled,
          finger-sized tiles (see StudioSidebar) sit without clipping, and
          padded by the bottom safe-area inset (home indicator / gesture bar). */}
      <div
        className="z-10 flex min-w-0 shrink-0 items-center border-t border-ink-100 bg-white lg:hidden"
        style={{ height: "calc(4rem + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {rail}
      </div>

      <footer className="z-10 hidden h-7 shrink-0 items-center border-t border-ink-100 bg-white px-3 lg:flex">
        {statusBar}
      </footer>
    </div>
  );
}

export default StudioShell;
