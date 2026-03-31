import ProductCard from "../components/ProductCard";
import { products } from "../data";

function ProductsPage() {
  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Product listing</p>
          <h2>Mock product catalog with image, name, and price.</h2>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}

export default ProductsPage;
