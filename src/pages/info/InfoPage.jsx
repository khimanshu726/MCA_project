import Seo from "../../components/Seo";

/**
 * Shared frame for the shop's information pages (About, Contact, FAQ,
 * Privacy, Terms): a compact title block and readable prose width.
 */
function InfoPage({ eyebrow, title, intro, seoTitle, description, path, updated, children }) {
  return (
    <main className="page-stack">
      <Seo title={seoTitle || title} description={description} path={path} />
      <section className="section-panel info-page">
        <header className="info-page-head">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {intro ? <p className="info-page-intro">{intro}</p> : null}
          {updated ? <p className="info-page-updated">Last updated {updated}</p> : null}
        </header>
        <div className="info-page-body">{children}</div>
      </section>
    </main>
  );
}

export default InfoPage;
