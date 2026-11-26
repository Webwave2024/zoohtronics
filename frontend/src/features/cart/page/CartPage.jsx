import { useEffect } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { fetchCart, removeCartItem, updateCartItem } from "../state/cartSlice";
import { formatPrice } from "../../../shared/format";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const { cart, cartStatus, cartError } = useAppSelector((state) => state.cart);
  const items = cart?.items || [];

  useEffect(() => {
    if (!cart) dispatch(fetchCart());
  }, [cart, dispatch]);

  const mixedCurrency = cart?.hasMixedCurrencies;
  const subtotal = cart?.subtotal;
  const currency = cart?.currency || items[0]?.laptop?.currency;

  return (
    <main className="commerce-page">
      <div className="commerce-page__heading">
        <p className="eyebrow">YOUR BAG</p>
        <h1>Your shopping cart</h1>
        <p>Review the laptops ready for quick dispatch.</p>
      </div>

      {cartError && <div className="notice notice--error" role="alert">{cartError}</div>}

      {cartStatus === "loading" && !cart ? (
        <div className="state-card"><h3>Loading your bag…</h3></div>
      ) : items.length === 0 ? (
        <div className="state-card">
          <ShoppingBag size={48} strokeWidth={1.3} />
          <h2>Your bag is empty.</h2>
          <p>Explore laptops tested, cleaned, and warrantied by our team.</p>
          <Link className="button button--primary" to="/laptops">Explore laptops</Link>
        </div>
      ) : (
        <div className="commerce-layout">
          <section className="cart-items" aria-label="Cart items">
            {items.map((item) => {
              const laptop = item.laptop;
              const image = laptop?.images?.[0];
              const imageUrl = typeof image === "string" ? image : image?.url;
              return (
                <article className="cart-item" key={item.id}>
                  <div className="cart-item__media">
                    {imageUrl ? <img src={imageUrl} alt={image?.altText || laptop?.title} loading="lazy" /> : <div className="cart-item__placeholder" />}
                  </div>
                  <div className="cart-item__details">
                    <p className="cart-item__brand">{laptop?.brand}</p>
                    <h2><Link to={`/laptops/${laptop?.id}`}>{laptop?.title}</Link></h2>
                    <p className="cart-item__specs">
                      {laptop?.processor} • {laptop?.ramGB}GB RAM • {laptop?.storageGB}GB {laptop?.storageType}
                    </p>
                    <p className="cart-item__price">{formatPrice(laptop?.price, laptop?.currency)}</p>
                  </div>
                  <div className="cart-item__actions">
                    <div className="quantity-control" aria-label="Quantity">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={item.quantity <= 1}
                        onClick={() => dispatch(updateCartItem({ itemId: item.id, quantity: item.quantity - 1 }))}
                      >
                        <Minus size={15} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={item.quantity >= (laptop?.stockQuantity || 1)}
                        onClick={() => dispatch(updateCartItem({ itemId: item.id, quantity: item.quantity + 1 }))}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="cart-item__remove"
                      aria-label="Remove item"
                      onClick={() => dispatch(removeCartItem(item.id))}
                    >
                      <Trash2 size={16} /> <span>Remove</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="summary-card" aria-label="Order summary">
            <h2>Order summary</h2>
            <div className="summary-card__row">
              <span>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
              <strong>{mixedCurrency ? "Mixed" : formatPrice(subtotal, currency)}</strong>
            </div>
            <p className="summary-card__note">Shipping & taxes calculated at checkout.</p>
            <Link className="button button--primary button--full" to="/checkout">
              Proceed to checkout <ArrowRight size={16} />
            </Link>
            <Link className="button button--ghost button--full" to="/laptops">Continue shopping</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
