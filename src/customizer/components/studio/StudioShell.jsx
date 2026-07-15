/**
 * Studio layout. Pure structure, zero logic — every responsive decision for
 * the workspace lives here, in one file.
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
    <div className="flex h-dvh flex-col overflow-hidden bg-ink-100">
      <header className="z-20 flex h-14 shrink-0 items-center border-b border-ink-100 bg-white px-3">
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

      <div className="z-10 flex h-14 min-w-0 shrink-0 items-center border-t border-ink-100 bg-white lg:hidden">
        {rail}
      </div>

      <footer className="z-10 hidden h-7 shrink-0 items-center border-t border-ink-100 bg-white px-3 lg:flex">
        {statusBar}
      </footer>
    </div>
  );
}

export default StudioShell;
