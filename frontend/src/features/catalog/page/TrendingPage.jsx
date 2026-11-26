import { useEffect } from "react";
import { ArrowLeft, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { fetchAllTrending } from "../state/catalogSlice";
import RankedProductsFilters from "../components/RankedProductsFilters";

export default function TrendingPage() {
  const dispatch = useAppDispatch();
  const { allTrending, allTrendingFallback, allTrendingStatus, allTrendingError } =
    useAppSelector((state) => state.catalog);

  useEffect(() => {
    const controller = new AbortController();
    dispatch(fetchAllTrending(undefined, { signal: controller.signal }));
    return () => controller.abort();
  }, [dispatch]);

  return (
    <main className="best-sellers-page">
      <Link className="best-sellers-page__back" to="/">
        <ArrowLeft size={16} /> Back to home
      </Link>
      <header className="best-sellers-page__heading">
        <p className="eyebrow"><span />POPULAR RIGHT NOW</p>
        <h1><Flame size={28} /> Top <em>Trending</em></h1>
        <p>
          {allTrendingFallback
            ? "Fresh in-stock picks while recent sales build."
            : "Laptops ordered most frequently in the last 30 days."}
        </p>
      </header>

      {allTrendingStatus === "loading" ? (
        <div className="best-sellers__grid" aria-label="Loading trending products">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="best-seller-skeleton" key={index} />
          ))}
        </div>
      ) : allTrendingError ? (
        <div className="state-card state-card--error">
          <p>{allTrendingError}</p>
          <button
            className="button button--outline"
            type="button"
            onClick={() => dispatch(fetchAllTrending())}
          >
            Try again
          </button>
        </div>
      ) : (
        <RankedProductsFilters
          products={allTrending}
          fallback={allTrendingFallback}
          metricLabel="orders"
          fallbackLabel="Trending"
        />
      )}
    </main>
  );
}
