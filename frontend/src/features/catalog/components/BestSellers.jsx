import { useState } from "react";
import { ArrowLeftRight, ArrowRight, Check, CheckCircle2, Heart, ShieldCheck, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { addCartItem, addWishlistItem, removeWishlistItem } from "../../cart/state/cartSlice";
import { toggleCompareItem } from "../state/compareSlice";
import { formatPrice } from "../../../shared/format";

export function BestSellerCard({
  product,
  fallback,
  metricLabel = "sold",
  fallbackLabel = "Handpicked",
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authenticated = useAppSelector((state) => state.auth.status === "authenticated");
  const cartStatus = useAppSelector((state) => state.cart.cartStatus);
  const wishlist = useAppSelector((state) => state.cart.wishlist);
  const wishlistStatus = useAppSelector((state) => state.cart.wishlistStatus);
  const compareItems = useAppSelector((state) => state.compare?.compareItems || []);
  const [imageIndex, setImageIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [wishlistError, setWishlistError] = useState("");
  const [addedAnimation, setAddedAnimation] = useState(false);

  const images = product.images || [];
  const currentImage = images[imageIndex];
  const imageUrl = typeof currentImage === "string" ? currentImage : currentImage?.url;
  const saved = wishlist.some((item) => item.id === product.id);
  const isComparing = compareItems.some((item) => item.id === product.id);

  // Price & Discount calculation
  const currentPriceNum = Number(product.price) || 0;
  const comparePriceNum = Number(product.compareAtPrice) || (currentPriceNum ? Math.round(currentPriceNum * 1.65) : 0);
  const hasDiscount = comparePriceNum > currentPriceNum;
  const discountPct = hasDiscount
    ? Math.round(((comparePriceNum - currentPriceNum) / comparePriceNum) * 100)
    : 0;

  // Title formatting according to reference: Brand Model | Processor | Screen | OS | Refurbished
  const cleanModel = product.model || product.title;
  const titleParts = [
    cleanModel,
    product.processor,
    product.displaySizeInches ? `${product.displaySizeInches}" FHD Screen` : '14" FHD Screen',
    product.operatingSystem || "Windows 11 Pro",
    "Refurbished",
  ].filter(Boolean);
  const displayTitle = titleParts.join(" | ");

  // Highlight badge
  const highlightTag =
    product.tags?.[0] ||
    (currentPriceNum < 40000
      ? "Student-friendly"
      : product.ramGB >= 16
      ? "Performance & Multitasking"
      : "Business-ready");

  async function addToCart(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isAdding) return;
    setIsAdding(true);
    setError("");
    try {
      const result = await dispatch(addCartItem({ laptopId: product.id, quantity: 1, product }));
      if (result.error) {
        setError(result.payload || "Could not add this laptop to your bag.");
      } else {
        setAddedAnimation(true);
        setTimeout(() => setAddedAnimation(false), 1800);
      }
    } catch (err) {
      setError(err?.message || "Could not add this laptop to your bag.");
    } finally {
      setIsAdding(false);
    }
  }

  async function toggleSaved() {
    if (!authenticated) {
      navigate("/login", { state: { from: { pathname: `/laptops/${product.id}` } } });
      return;
    }
    setWishlistError("");
    const result = await dispatch(saved ? removeWishlistItem(product.id) : addWishlistItem(product.id));
    if (result.error) setWishlistError(result.payload || "Could not update your saved laptops.");
  }

  // Dots array (support multi-image or interactive dot previews)
  const dotCount = Math.max(images.length, 6);
  const dots = Array.from({ length: dotCount });

  return (
    <article className="best-seller-card edify-card">
      <div className="best-seller-card__media edify-card__media">
        {/* Wishlist toggle */}
        <button
          className={`best-seller-card__favorite${saved ? " is-saved" : ""}`}
          type="button"
          aria-label={saved ? "Remove from wishlist" : "Save for later"}
          disabled={wishlistStatus === "loading"}
          onClick={toggleSaved}
          title={saved ? "Saved to wishlist" : "Save to wishlist"}
        >
          <Heart size={15} fill={saved ? "currentColor" : "none"} />
        </button>

        {/* Compare button matching reference */}
        <button
          className={`best-seller-card__compare-btn${isComparing ? " is-active" : ""}`}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dispatch(toggleCompareItem(product));
          }}
          aria-label="Compare laptop"
          title={isComparing ? "Remove from compare" : "Compare this laptop"}
        >
          <ArrowLeftRight size={13} />
          <span>{isComparing ? "Comparing" : "Compare"}</span>
        </button>

        {/* Product Image */}
        <Link className="best-seller-card__image" to={`/laptops/${product.id}`}>
          {imageUrl ? (
            <img src={imageUrl} alt={currentImage?.altText || product.title} loading="lazy" />
          ) : (
            <div className="best-seller-card__placeholder">No image</div>
          )}
        </Link>

        {/* Guarantee Seal in bottom right */}
        <div className="edify-card__seal" title="Zohntronics Tested & Certified Guarantee">
          <div className="edify-card__seal-inner">
            <ShieldCheck size={12} strokeWidth={2.4} />
            <span>CERTIFIED</span>
          </div>
          <div className="edify-card__seal-ribbon" />
        </div>

        {/* Pagination Dots indicator */}
        <div className="edify-card__dots" role="tablist" aria-label="Product thumbnails">
          {dots.map((_, index) => {
            const isActive = index === (images.length > 0 ? imageIndex % images.length : 0);
            return (
              <button
                key={index}
                className={`edify-dot${isActive ? " is-active" : ""}`}
                type="button"
                aria-label={`View image ${index + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (images.length > 0) setImageIndex(index % images.length);
                }}
                onMouseEnter={() => {
                  if (images.length > 0) setImageIndex(index % images.length);
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="best-seller-card__body edify-card__body">
        {/* Brand */}
        <p className="edify-card__brand">{product.brand}</p>
        <span className="edify-card__refurbished">Refurbished</span>

        {/* Title */}
        <h3 className="edify-card__title">
          <Link to={`/laptops/${product.id}`}>{displayTitle}</Link>
        </h3>

        {/* Star Rating */}
        <div className="edify-card__rating">
          <div className="edify-card__stars" aria-label="5 stars rating">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />
            ))}
          </div>
          <span className="edify-card__reviews-count">({product.reviewCount || 18})</span>
        </div>

        {/* Specs Pills */}
        <div className="edify-card__specs">
          {product.processor && <span>{product.processor}</span>}
          {product.processorGeneration && <span>{product.processorGeneration}</span>}
          {product.ramGB && <span>{product.ramGB}GB</span>}
          {product.storageGB && <span>{product.storageGB}GB</span>}
          <span>{product.operatingSystem?.toLowerCase().includes("win") ? "Windows 11 pro" : (product.operatingSystem || "Windows 11 pro")}</span>
        </div>

        {/* Highlight Tag (e.g. Student-friendly) */}
        <div className="edify-card__highlight">
          <span>{highlightTag}</span>
        </div>

        {/* Pricing Row */}
        <div className="edify-card__price-row">
          <div className="edify-card__price">
            <strong>{formatPrice(currentPriceNum, product.currency)}</strong>
            {hasDiscount && (
              <del>{formatPrice(comparePriceNum, product.currency)}</del>
            )}
            {hasDiscount && (
              <span className="edify-card__discount-badge">{discountPct}% off</span>
            )}
          </div>
          <p className="edify-card__tax">Price includes 18% GST</p>
        </div>

        {/* Warranty Row */}
        <div className="edify-card__warranty">
          <CheckCircle2 size={15} color="#059669" />
          <span>Warranty Included</span>
        </div>

        {error && <p className="best-seller-card__error">{error}</p>}
        {wishlistError && <p className="best-seller-card__error">{wishlistError}</p>}

        {/* Add to Cart Button */}
        <button
          className={`edify-card__add-btn${addedAnimation ? " is-added" : ""}`}
          type="button"
          disabled={isAdding || product.stockQuantity < 1}
          onClick={addToCart}
        >
          {addedAnimation ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Check size={16} strokeWidth={2.5} /> Added to Cart!
            </span>
          ) : isAdding ? (
            "Adding to Cart..."
          ) : product.stockQuantity < 1 ? (
            "Out of stock"
          ) : (
            "Add to Cart"
          )}
        </button>
      </div>
    </article>
  );
}

export default function BestSellers({
  products,
  fallback,
  status,
  error,
  onRetry,
}) {
  return (
    <section className="best-sellers" aria-labelledby="best-sellers-title">
      <div className="best-sellers__heading">
        <div>
          <p className="eyebrow"><span />PROVEN PICKS</p>
          <h2 id="best-sellers-title">Top 5 Best Sellers</h2>
          <p>
            {fallback
              ? "Handpicked laptops our customers turn to most."
              : "Our highest-volume performers over the last 90 days."}
          </p>
        </div>
        <Link className="best-sellers__view-all" to="/best-sellers">
          View all <ArrowRight size={16} />
        </Link>
      </div>

      {status === "loading" ? (
        <div className="best-sellers__grid" aria-label="Loading best sellers">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="best-seller-skeleton" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="state-card state-card--inline">
          <p>{error}</p>
          {onRetry && (
            <button className="button button--outline" type="button" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      ) : (
        <div className="best-sellers__grid">
          {products.map((product) => (
            <BestSellerCard key={product.id} product={product} fallback={fallback} />
          ))}
        </div>
      )}
    </section>
  );
}
