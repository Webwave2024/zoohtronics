import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { fetchAllBestSellers } from "../state/catalogSlice";
import RankedProductsFilters from "../components/RankedProductsFilters";

export default function BestSellersPage() {
  const dispatch = useAppDispatch();
  const { allBestSellers, allBestSellersFallback, allBestSellersStatus, allBestSellersError } =
    useAppSelector((state) => state.catalog);

  useEffect(() => {
    const controller = new AbortController();
    dispatch(fetchAllBestSellers(undefined, { signal: controller.signal }));
    return () => controller.abort();
  }, [dispatch]);

  return (
    <main className="best-sellers-page">
      <Link className="best-sellers-page__back" to="/">
        <ArrowLeft size={16} /> Back to home
      </Link>
      <header className="best-sellers-page__heading">
        <p className="eyebrow"><span />POPULAR PICKS</p>
        <h1>Top <em>Best Sellers</em></h1>
        <p>
          {allBestSellersFallback
            ? "Handpicked laptops our customers turn to most."
            : "Every laptop ranked by units sold over the last 90 days."}
        </p>
      </header>

      {allBestSellersStatus === "loading" ? (
        <div className="best-sellers__grid" aria-label="Loading best sellers">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="best-seller-skeleton" key={index} />
          ))}
        </div>
      ) : allBestSellersError ? (
        <div className="state-card state-card--error">
          <p>{allBestSellersError}</p>
          <button
            className="button button--outline"
            type="button"
            onClick={() => dispatch(fetchAllBestSellers())}
          >
            Try again
          </button>
        </div>
      ) : (
        <RankedProductsFilters
          products={allBestSellers}
          fallback={allBestSellersFallback}
          metricLabel="sold"
          fallbackLabel="Handpicked"
        />
      )}
    </main>
  );
}
