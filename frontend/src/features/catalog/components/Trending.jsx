import { ArrowRight, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { BestSellerCard } from "./BestSellers";

export default function Trending({ products, fallback, status, error, onRetry }) {
  return (
    <section className="best-sellers trending-section" aria-labelledby="trending-title">
      <div className="best-sellers__heading">
        <div>
          <p className="eyebrow"><span />POPULAR RIGHT NOW</p>
          <h2 id="trending-title"><Flame size={31} /> Trending</h2>
          <p>
            {fallback
              ? "Fresh in-stock picks while recent sales build."
              : "Laptops customers are buying most in the last 30 days."}
          </p>
        </div>
        <Link className="best-sellers__view-all" to="/trending">
          View all <ArrowRight size={16} />
        </Link>
      </div>
      {status === "loading" ? (
        <div className="best-sellers__grid" aria-label="Loading trending products">
          {Array.from({ length: 5 }, (_, index) => <div className="best-seller-skeleton" key={index} />)}
        </div>
      ) : error ? (
        <div className="state-card state-card--inline">
          <p>{error}</p>
          {onRetry && <button className="button button--outline" type="button" onClick={onRetry}>Try again</button>}
        </div>
      ) : (
        <div className="best-sellers__grid">
          {products.map((product) => (
            <BestSellerCard
              key={product.id}
              product={product}
              fallback={fallback}
              metricLabel="orders"
              fallbackLabel="Trending"
            />
          ))}
        </div>
      )}
    </section>
  );
}
