import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { addCartItem, addWishlistItem, removeWishlistItem } from "../../cart/state/cartSlice";
import { BestSellerCard } from "../components/BestSellers";
import { catalogApi } from "../service/catalogService";
import { fetchProduct } from "../state/catalogSlice";
import { formatPrice, gradeLabels } from "../../../shared/format";

const laptopSpecs = [
  ["Processor", "processor"],
  ["Generation", "processorGeneration"],
  ["Memory", "ramGB", " GB RAM"],
  ["Storage", "storageGB", " GB"],
  ["Storage type", "storageType"],
  ["Graphics", "graphics"],
  ["Display", "displaySizeInches", '"'],
  ["Resolution", "resolution"],
  ["Operating system", "operatingSystem"],
  ["Battery health", "batteryHealthPct", "%"],
  ["Warranty", "warrantyMonths", " months"],
];

function LaptopFallback() {
  return <div className="detail-placeholder"><div className="detail-placeholder__screen"><span>Z</span></div><div className="detail-placeholder__base" /></div>;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { product, productStatus, productError } = useAppSelector((state) => state.catalog);
  const { wishlist, cartError, wishlistError } = useAppSelector((state) => state.cart);
  const authenticated = useAppSelector((state) => state.auth.status === "authenticated");
  const saved = wishlist.some((item) => item.id === id);
  const [activeImage, setActiveImage] = useState(0);
  const [commerceMessage, setCommerceMessage] = useState("");
  const [commerceLoading, setCommerceLoading] = useState(false);
  const [relatedResult, setRelatedResult] = useState({ productId: null, products: [], status: "idle", error: "" });

  useEffect(() => {
    const request = dispatch(fetchProduct(id));
    return () => request.abort();
  }, [dispatch, id]);

  useEffect(() => {
    if (!product || product.id !== id) return undefined;

    const controller = new AbortController();
    const categories = (product.categories || []).map((category) => category.slug).filter(Boolean);

    async function loadRelatedProducts() {
      try {
        const params = {
          page: 1,
          pageSize: 12,
          inStock: "true",
          ...(categories.length ? { categories: categories.join(",") } : { brand: product.brand }),
        };
        const response = await catalogApi.getProducts(params, controller.signal);
        const related = response.items.filter((item) => item.id !== product.id);

        if (related.length < 4 && categories.length && product.brand) {
          const brandResponse = await catalogApi.getProducts({
            page: 1,
            pageSize: 12,
            inStock: "true",
            brand: product.brand,
          }, controller.signal);
          const knownIds = new Set(related.map((item) => item.id));
          related.push(...brandResponse.items.filter((item) => (
            item.id !== product.id && !knownIds.has(item.id)
          )));
        }

        if (!controller.signal.aborted) {
          setRelatedResult({
            productId: product.id,
            products: related.slice(0, 4),
            status: "succeeded",
            error: "",
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setRelatedResult({
            productId: product.id,
            products: [],
            status: "failed",
            error: error.message,
          });
        }
      }
    }

    loadRelatedProducts();
    return () => controller.abort();
  }, [id, product]);

  if (productStatus === "loading" || productStatus === "idle") {
    return <main className="detail-state"><div className="detail-skeleton" /><div className="detail-skeleton detail-skeleton--copy" /></main>;
  }

  if (productStatus === "failed" || !product) {
    return (
      <main className="detail-state">
        <div className="state-card">
          <h1>We couldn’t find that laptop.</h1>
          <p>{productError || "It may have been sold or removed from the collection."}</p>
          <Link className="button button--primary" to="/">Back to the collection</Link>
        </div>
      </main>
    );
  }

  const images = product.images || [];
  const selectedImage = images[Math.min(activeImage, Math.max(images.length - 1, 0))];
  const specs = laptopSpecs.filter(([, field]) => product[field] !== null && product[field] !== undefined && product[field] !== "");
  const relatedResultIsCurrent = relatedResult.productId === product.id;
  const relatedProducts = relatedResultIsCurrent ? relatedResult.products : [];
  const relatedStatus = relatedResultIsCurrent ? relatedResult.status : "loading";
  const relatedError = relatedResultIsCurrent ? relatedResult.error : "";

  async function handleAddToCart() {
    setCommerceLoading(true);
    setCommerceMessage("");
    try {
      const result = await dispatch(addCartItem({ laptopId: id, quantity: 1, product }));
      if (addCartItem.fulfilled.match(result)) setCommerceMessage("Added to your bag.");
      else setCommerceMessage(result.payload || "Could not add this laptop to your bag.");
    } catch (err) {
      setCommerceMessage(err?.message || "Could not add this laptop to your bag.");
    } finally {
      setCommerceLoading(false);
    }
  }

  async function handleWishlist() {
    if (!authenticated) {
      navigate("/login", { state: { from: { pathname: `/laptops/${id}` } } });
      return;
    }
    setCommerceLoading(true);
    setCommerceMessage("");
    const result = await dispatch(saved ? removeWishlistItem(id) : addWishlistItem(id));
    setCommerceLoading(false);
    if (removeWishlistItem.fulfilled.match(result) || addWishlistItem.fulfilled.match(result)) {
      setCommerceMessage(saved ? "Removed from your saved laptops." : "Saved for later.");
    } else {
      setCommerceMessage(result.payload || "Could not update your saved laptops.");
    }
  }

  return (
    <main className="product-detail">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/"><ArrowLeft size={15} /> Shop laptops</Link>
        <ChevronRight size={14} />
        <span>{product.brand}</span>
        <ChevronRight size={14} />
        <span>{product.model}</span>
      </nav>

      <div className="detail-layout">
        <section className="detail-gallery" aria-label="Product images">
          <div className="detail-gallery__main">
            {selectedImage?.url ? (
              <img src={selectedImage.url} alt={selectedImage.altText || product.title} />
            ) : <LaptopFallback />}
            <span className="product-card__condition">{gradeLabels[product.refurbishmentGrade] || product.refurbishmentGrade} condition</span>
            {product.featured && <span className="product-card__featured">Featured</span>}
          </div>
          {images.length > 1 && (
            <div className="detail-gallery__thumbs">
              {images.map((image, index) => (
                <button className={index === activeImage ? "is-active" : ""} type="button" key={image.id || image.url} onClick={() => setActiveImage(index)} aria-label={`View product image ${index + 1}`}>
                  <img src={image.url} alt={image.altText || ""} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="detail-summary">
          <p className="product-card__brand">{product.brand} <span>/</span> {product.model}</p>
          <h1>{product.title}</h1>
          <div className="detail-condition"><span><Check size={14} /> {gradeLabels[product.refurbishmentGrade] || product.refurbishmentGrade} refurbished</span><span>SKU {product.sku}</span></div>
          <div className="detail-price">
            <strong>{formatPrice(product.price, product.currency)}</strong>
            {product.compareAtPrice && <del>{formatPrice(product.compareAtPrice, product.currency)}</del>}
            {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && <span>Save {formatPrice(Number(product.compareAtPrice) - Number(product.price), product.currency)}</span>}
          </div>
          <p className="detail-tax">Price includes 18% GST. Shipping calculated at checkout.</p>
          <div className="detail-actions">
            <button className="button button--primary" type="button" onClick={handleAddToCart} disabled={commerceLoading || product.stockQuantity < 1}>
              <ShoppingBag size={18} /> {commerceLoading ? "Updating…" : product.stockQuantity < 1 ? "Out of stock" : "Add to bag"}
            </button>
            <button className={`icon-button detail-wishlist${saved ? " is-saved" : ""}`} type="button" aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={saved} disabled={commerceLoading} onClick={handleWishlist}>
              <Heart size={20} />
            </button>
          </div>
          {(commerceMessage || cartError || wishlistError) && <p className={commerceMessage.includes("Could not") || cartError || wishlistError ? "detail-error" : "add-confirmation"} role="status"><Check size={16} /> {commerceMessage || cartError || wishlistError} {commerceMessage && <Link to="/cart">View bag</Link>}</p>}
          <div className="detail-assurances">
            <div><ShieldCheck size={19} /><span><strong>{product.warrantyMonths} month warranty</strong><small>Included with your laptop</small></span></div>
            <div><Truck size={19} /><span><strong>Carefully packed</strong><small>Delivery options at checkout</small></span></div>
          </div>
          <div className="detail-description">
            <h2>About this laptop</h2>
            <p>{product.description}</p>
            {product.conditionNotes && <p>{product.conditionNotes}</p>}
          </div>
        </section>
      </div>

      <section className="spec-section">
        <div className="section-heading">
          <div><p className="eyebrow">THE DETAILS</p><h2>Good to <em>know.</em></h2></div>
          <span className="spec-grade"><ShieldCheck size={17} /> {gradeLabels[product.refurbishmentGrade]} condition</span>
        </div>
        <dl className="spec-grid">
          {specs.map(([label, field, suffix = ""]) => <div key={field}><dt>{label}</dt><dd>{product[field]}{suffix}</dd></div>)}
          <div><dt>RAM type</dt><dd>{product.ramType || "Not specified"}</dd></div>
          <div><dt>Color</dt><dd>{product.color || "Not specified"}</dd></div>
          <div><dt>Touchscreen</dt><dd>{product.touchscreen ? "Yes" : "No"}</dd></div>
          <div><dt>Release year</dt><dd>{product.releaseYear || "Not specified"}</dd></div>
        </dl>
      </section>

      {(relatedStatus === "loading" || relatedError || relatedProducts.length > 0) && (
        <section className="best-sellers related-products" aria-labelledby="related-products-title">
          <div className="best-sellers__heading">
            <div>
              <p className="eyebrow"><span />YOU MAY ALSO LIKE</p>
              <h2 id="related-products-title">Related <em>laptops</em></h2>
              <p>More options picked from similar laptops.</p>
            </div>
          </div>
          {relatedStatus === "loading" && <p role="status">Finding similar laptops…</p>}
          {relatedError && <p className="detail-error" role="status">{relatedError}</p>}
          {relatedProducts.length > 0 && (
            <div className="best-sellers__grid">
              {relatedProducts.map((relatedProduct) => (
                <BestSellerCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="detail-back">
        <Link className="text-link" to="/"><ArrowLeft size={16} />
         Back to all laptops</Link>
      </section>
    </main>
  );
}
