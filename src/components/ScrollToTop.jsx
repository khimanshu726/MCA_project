import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Puts every new page at the top, and puts every page you come *back* to
 * exactly where you left it.
 *
 * A single-page app keeps the window's scroll position across route changes,
 * so following a footer link from the bottom of a long page loaded the new
 * route already scrolled to the bottom — which reads as "the link didn't
 * work" rather than "you are on a new page".
 *
 * The distinction that matters is *how* the navigation happened, which is why
 * this uses the navigation type rather than just watching the pathname:
 *
 *   PUSH / REPLACE — a deliberate move to somewhere new. Start at the top.
 *   POP            — browser back or forward. The customer is returning to
 *                    something they already read; yanking them to the top
 *                    loses their place in a long catalog. The browser's own
 *                    restoration is correct here, so leave it alone.
 *
 * The jump itself is instant rather than animated — see the note at the call
 * below for why smooth was tried, measured, and rejected here.
 */
function ScrollToTop() {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Let the browser own scroll restoration for history navigation. Setting
    // this once here — rather than fighting it per navigation — keeps back and
    // forward behaving the way the customer expects everywhere in the app.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "auto";
    }
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (navigationType === "POP") {
      return;
    }

    // Instant, not smooth — deliberately, and against the first instinct.
    //
    // Smooth was tried and measured: leaving the footer of the home page and
    // landing on /products took roughly four seconds of animation, because the
    // distance is ~5000px. For four seconds the customer watches the page they
    // just left scroll past, which is a worse version of the bug being fixed
    // here, not a fix for it.
    //
    // Smooth scrolling earns its place for in-page moves, where the animation
    // shows you how far you travelled and the destination was already on
    // screen. On a route change the content is replaced wholesale; there is no
    // spatial relationship to preserve, and every major storefront jumps.
    //
    // `html { scroll-behavior: smooth }` in styles.css would otherwise apply
    // here, so this passes the behaviour explicitly to override it. It must be
    // "instant", not "auto": "auto" defers to the CSS `scroll-behavior` (i.e.
    // smooth), which is the ~4s animated jump measured and rejected above;
    // only "instant" forces the immediate jump this fix depends on.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // `search` is included so filtering the catalog (?category=…) also returns
    // the customer to the top of the results rather than leaving them halfway
    // down the previous, longer list.
  }, [pathname, search, navigationType]);

  return null;
}

export default ScrollToTop;
