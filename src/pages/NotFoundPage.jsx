import { Link, useLocation } from "react-router-dom";
import Seo from "../components/Seo";

// Shown for any URL the storefront doesn't recognise. It used to silently
// redirect to the home page, which hid mistyped links from the visitor and made
// every unknown URL look like a duplicate of the home page to search engines.
// `noindex` keeps this page out of search results; the server also answers
// these URLs with a 404 status (see server/utils/spaRoutes.js).
function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <main className="page-stack">
      <Seo title="Page not found" description="The page you were looking for doesn't exist." path={pathname} noindex />
      <section className="empty-state-card">
        <p className="eyebrow">Error 404</p>
        <h1>We couldn&rsquo;t find that page</h1>
        <p>The link may be mistyped, or the page may have moved. Try one of these instead:</p>
        <div className="flex flex-wrap gap-3">
          <Link className="primary-button" to="/">
            Go to the home page
          </Link>
          <Link className="secondary-button" to="/products">
            Browse all products
          </Link>
        </div>
      </section>
    </main>
  );
}

export default NotFoundPage;
