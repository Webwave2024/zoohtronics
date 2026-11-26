import { useState } from "react";
import { Heart, ArrowUpRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { addWishlistItem, removeWishlistItem } from "../../features/cart/state/cartSlice";
import { formatPrice, gradeLabels } from "../format";

export default function ProductCard({ product }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const saved = useAppSelector((state) => state.cart.wishlist.some((item) => item.id === product.id));
  const authenticated = useAppSelector((state) => state.auth.status === "authenticated");
  const wishlistStatus = useAppSelector((state) => state.cart.wishlistStatus);
  const [wishlistError, setWishlistError] = useState("");
  const image = product.images?.[0];

  async function toggleSaved() {
    if (!authenticated) {
      navigate("/login", { state: { from: { pathname: `/laptops/${product.id}` } } });
      return;
    }
    setWishlistError("");
    const result = await dispatch(saved ? removeWishlistItem(product.id) : addWishlistItem(product.id));
    if (result.error) setWishlistError(result.payload || "Could not update your saved laptops.");
  }

  return (
    <article className="product-card">
      <Link className="product-card__image" to={`/laptops/${product.id}`}>
        {image?.url ? (
          <img src={image.url} alt={image.altText || product.title} loading="lazy" />
        ) : (
          <div className="laptop-placeholder" role="img" aria-label={`${product.brand} laptop image unavailable`}>
            <span />
          </div>
        )}
        <span className="product-card__condition">
          {gradeLabels[product.refurbishmentGrade] || product.refurbishmentGrade}
        </span>
        {product.featured && <span className="product-card__featured">Featured</span>}
      </Link>
      <button
        className={`icon-button product-card__favorite${saved ? " is-saved" : ""}`}
        type="button"
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={saved}
        disabled={wishlistStatus === "loading"}
        onClick={toggleSaved}
      >
        <Heart size={18} />
      </button>
      {wishlistError && <span className="wishlist-action-error" role="status">{wishlistError}</span>}
      <div className="product-card__body">
        <p className="product-card__brand">{product.brand} <span>/</span> {product.model}</p>
        <Link className="product-card__title" to={`/laptops/${product.id}`}>{product.title}</Link>
        <p className="product-card__specs">{product.processor} <span>·</span> {product.ramGB}GB RAM <span>·</span> {product.storageGB}GB {product.storageType}</p>
        <div className="product-card__bottom">
          <div>
            <strong>{formatPrice(product.price, product.currency)}</strong>
            {product.compareAtPrice && <del>{formatPrice(product.compareAtPrice, product.currency)}</del>}
          </div>
          <Link className="product-card__link" to={`/laptops/${product.id}`} aria-label={`View ${product.title}`}>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
