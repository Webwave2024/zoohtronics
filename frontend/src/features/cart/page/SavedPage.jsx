import { useEffect } from "react";
import { ArrowRight, Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { addCartItem, fetchWishlist, removeWishlistItem } from "../state/cartSlice";
import { formatPrice, gradeLabels } from "../../../shared/format";

export default function SavedPage() {
  const dispatch = useAppDispatch();
  const { wishlist, wishlistStatus, wishlistError, cartError } = useAppSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  return (
    <main className="commerce-page">
      <div className="commerce-page__heading">
        <p className="eyebrow">YOUR SHORTLIST</p>
        <h1>Saved laptops</h1>
        <p>Keep the ones you love close while you decide.</p>
      </div>
      {(wishlistError || cartError) && <div className="notice notice--error" role="alert">{wishlistError || cartError}</div>}
      {wishlistStatus === "loading" && !wishlist.length ? (
        <div className="state-card"><h3>Loading your saved laptops…</h3></div>
      ) : wishlist.length === 0 ? (
        <div className="state-card">
          <Heart size={48} strokeWidth={1.3} />
          <h2>You have no saved laptops yet.</h2>
          <p>Tap the heart icon on any laptop to shortlist it for later.</p>
          <Link className="button button--primary" to="/laptops">Explore laptops</Link>
        </div>
      ) : (
        <div className="saved-grid">
          {wishlist.map((laptop) => {
            const image = laptop?.images?.[0];
            const imageUrl = typeof image === "string" ? image : image?.url;
            return (
              <article className="saved-card" key={laptop.id}>
                <div className="saved-card__media">
                  {imageUrl ? <img src={imageUrl} alt={image?.altText || laptop.title} loading="lazy" /> : <div className="saved-card__placeholder" />}
                  <button
                    type="button"
                    className="saved-card__remove"
                    aria-label="Remove from wishlist"
                    onClick={() => dispatch(removeWishlistItem(laptop.id))}
                  >
                    <Heart size={18} fill="currentColor" />
                  </button>
                </div>
                <div className="saved-card__body">
                  <span className="saved-card__grade">{gradeLabels[laptop.refurbishmentGrade] || laptop.refurbishmentGrade}</span>
                  <h2><Link to={`/laptops/${laptop.id}`}>{laptop.title}</Link></h2>
                  <p className="saved-card__specs">{laptop.processor} • {laptop.ramGB}GB RAM • {laptop.storageGB}GB {laptop.storageType}</p>
                  <p className="saved-card__price">{formatPrice(laptop.price, laptop.currency)}</p>
                  <button
                    type="button"
                    className="button button--primary button--full"
                    onClick={() => dispatch(addCartItem({ laptopId: laptop.id, quantity: 1 }))}
                  >
                    <ShoppingBag size={16} /> Add to bag
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
