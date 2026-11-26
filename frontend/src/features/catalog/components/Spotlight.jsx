import { useState } from "react";
import { ArrowRight, BadgeCheck, ShoppingBag, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { addCartItem } from "../../cart/state/cartSlice";
import { formatPrice, gradeLabels } from "../../../shared/format";

export default function Spotlight({ product, status, error, onRetry }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authenticated = useAppSelector((state) => state.auth.status === "authenticated");
  const cartStatus = useAppSelector((state) => state.cart.cartStatus);
  const [cartError, setCartError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const image = product?.images?.[0];
  const imageUrl = typeof image === "string" ? image : image?.url;
  const discount = product?.compareAtPrice
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice)) * 100)
    : 0;

  async function addToCart() {
    if (isAdding) return;
    setIsAdding(true);
    setCartError("");
    try {
      const result = await dispatch(addCartItem({ laptopId: product.id, quantity: 1, product }));
      if (result.error) {
        setCartError(result.payload || "Could not add this laptop to your bag.");
      } else {
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
      }
    } catch (err) {
      setCartError(err?.message || "Could not add this laptop to your bag.");
    } finally {
      setIsAdding(false);
    }
  }

  if (status === "loading") {
    return <section className="spotlight spotlight--skeleton" aria-label="Loading spotlight laptop" />;
  }

  if (error || !product) {
    return (
      <section className="spotlight spotlight--empty">
        <p>{error || "No spotlight deal right now."}</p>
        {onRetry && (
          <button className="button button--outline" type="button" onClick={onRetry}>
            Try again
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="spotlight" aria-labelledby="spotlight-title">
      <div className="spotlight__media">
        <span className="spotlight__tag">TODAY&apos;S SPOTLIGHT DEAL</span>
        {imageUrl ? (
          <img src={imageUrl} alt={image?.altText || product.title} />
        ) : (
          <div className="spotlight__placeholder">Featured laptop</div>
        )}
      </div>

      <div className="spotlight__content">
        <p className="eyebrow"><span />FEATURED WORKHORSE</p>
        <h2 id="spotlight-title">{product.title}</h2>
        <p className="spotlight__summary">{product.summary || product.description}</p>

        <div className="spotlight__specs">
          <div><span>PROCESSOR</span><strong>{product.processor}</strong></div>
          <div><span>MEMORY</span><strong>{product.ramGB} GB RAM</strong></div>
          <div><span>STORAGE</span><strong>{product.storageGB} GB {product.storageType}</strong></div>
          <div><span>CONDITION</span><strong>{gradeLabels[product.refurbishmentGrade] || product.refurbishmentGrade}</strong></div>
        </div>

        <div className="spotlight__trust">
          <span><BadgeCheck size={16} /> Certified 32-point inspection</span>
          <span><ShieldCheck size={16} /> {product.warrantyMonths || 12}-month warranty</span>
        </div>

        <div className="spotlight__pricing">
          <div>
            <span className="spotlight__price">{formatPrice(product.price, product.currency)}</span>
            {product.compareAtPrice && (
              <span className="spotlight__compare">{formatPrice(product.compareAtPrice, product.currency)}</span>
            )}
          </div>
          {discount > 0 && <span className="spotlight__discount">Save {discount}%</span>}
        </div>

        {cartError && <p className="spotlight__error">{cartError}</p>}

        <div className="spotlight__actions">
          <button
            className="button button--primary"
            type="button"
            disabled={isAdding || product.stockQuantity < 1}
            onClick={addToCart}
          >
            <ShoppingBag size={16} />
            {added ? "Added to bag!" : isAdding ? "Adding..." : product.stockQuantity < 1 ? "Out of stock" : "Add to bag"}
          </button>
          <Link className="button button--outline" to={`/laptops/${product.id}`}>
            View full specs <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
