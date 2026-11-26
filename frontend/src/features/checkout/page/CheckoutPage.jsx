import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CreditCard, MapPin, Plus, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { apiRequest } from "../../../shared/api/client";
import { formatPrice } from "../../../shared/format";
import { fetchCart } from "../../cart/state/cartSlice";
import { createAddress, fetchAddresses, placeOrder } from "../state/checkoutSlice";
import { startOnlinePayment } from "../service/payment";

const emptyAddress = {
  firstName: "",
  lastName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "IN",
  isDefault: false,
};

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { cart, cartStatus, cartError } = useAppSelector((state) => state.cart);
  const { addresses, addressesStatus, addressesError, saveAddressStatus, saveAddressError, placeOrderStatus, placeOrderError } = useAppSelector((state) => state.checkout);
  const user = useAppSelector((state) => state.auth.user);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentStarting, setPaymentStarting] = useState(false);
  const items = cart?.items || [];
  const activeAddress = selectedAddress || (addresses.find((address) => address.isDefault) || addresses[0])?.id || "";

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  useEffect(() => {
    if (!cart) dispatch(fetchCart());
  }, [cart, dispatch]);

  async function submitAddress(event) {
    event.preventDefault();
    const result = await dispatch(createAddress(addressForm));
    if (createAddress.fulfilled.match(result)) {
      setSelectedAddress(result.payload.created.id);
      setAddressForm(emptyAddress);
      setShowAddressForm(false);
    }
  }

  async function applyCoupon(event) {
    event.preventDefault();
    setCouponLoading(true);
    setCouponError("");
    setCoupon(null);
    try {
      const result = await apiRequest("/orders/coupons/validate", {
        method: "POST",
        body: { code: couponCode.trim() },
      });
      setCoupon(result.coupon);
    } catch (error) {
      setCouponError(error.message);
    } finally {
      setCouponLoading(false);
    }
  }

  async function completeCheckout(event) {
    event.preventDefault();
    setCheckoutError("");
    const result = await dispatch(placeOrder({
      shippingAddressId: activeAddress,
      paymentMethod: "CARD",
      ...(coupon ? { couponCode: coupon.code } : {}),
    }));
    if (!placeOrder.fulfilled.match(result)) return;
    const order = result.payload;
    if (order.paymentStatus === "SUCCEEDED") {
      navigate(`/orders/${order.id}?placed=1`, { replace: true });
      return;
    }

    setPaymentStarting(true);
    try {
      await startOnlinePayment({ order, user, navigate, onError: setCheckoutError });
    } catch (error) {
      setCheckoutError(`${error.message} Order ${order.orderNumber} has been created; open its details to retry or cancel.`);
      navigate(`/orders/${order.id}?payment=setup-failed`, { state: { paymentError: error.message } });
    } finally {
      setPaymentStarting(false);
    }
  }

  const subtotal = Number(cart?.subtotal || 0);
  const discount = Number(coupon?.discountAmount || 0);
  const total = coupon ? Number(coupon.totalAmount) : subtotal;
  const currency = cart?.currency || items[0]?.laptop?.currency;
  const disabled = !items.length || cart?.hasMixedCurrencies || cartStatus === "loading" || !activeAddress || placeOrderStatus === "loading" || paymentStarting;

  if (cartStatus !== "loading" && cart && !items.length) {
    return <main className="commerce-page"><div className="state-card cart-page-empty"><h1>Your cart is empty.</h1><p>Add a laptop before starting checkout.</p><Link className="button button--primary" to="/">Browse laptops</Link></div></main>;
  }

  return (
    <main className="commerce-page checkout-page">
      <div className="commerce-page__heading">
        <Link className="auth-back" to="/cart"><ArrowLeft size={15} /> Back to your cart</Link>
        <p className="eyebrow">SAFE & SECURE CHECKOUT</p>
        <h1>Almost yours.</h1>
        <p>Confirm your delivery details and pay securely online.</p>
      </div>
      {(cartError || addressesError || placeOrderError || checkoutError) && <div className="notice notice--error" role="alert">{cartError || addressesError || placeOrderError || checkoutError}</div>}
      {cart?.hasMixedCurrencies && <div className="notice notice--error">Your cart has multiple currencies. Return to your cart and remove items until they use one currency.</div>}

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-card">
            <div className="checkout-card__heading"><span className="step-number">1</span><div><h2>Delivery details</h2><p>Choose where we should send your order.</p></div></div>
            {addressesStatus === "loading" && !addresses.length && <p className="form-hint">Loading saved addresses…</p>}
            {addresses.map((address) => (
              <label className={`address-choice${activeAddress === address.id ? " is-selected" : ""}`} key={address.id}>
                <input type="radio" name="address" value={address.id} checked={activeAddress === address.id} onChange={() => setSelectedAddress(address.id)} />
                <span className="address-choice__radio" />
                <span className="address-choice__copy">
                  <strong>{address.firstName} {address.lastName} {address.isDefault && <i>DEFAULT</i>}</strong>
                  <span>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}</span>
                  <span>{address.city}, {address.state} {address.postalCode}, {address.countryCode}</span>
                  <span>{address.phone}</span>
                </span>
                <MapPin size={17} />
              </label>
            ))}
            {!addresses.length && addressesStatus === "succeeded" && !showAddressForm && <p className="form-hint">Add a delivery address to continue.</p>}
            {!showAddressForm && <button className="add-address-toggle" type="button" onClick={() => setShowAddressForm(true)}><Plus size={16} /> Add a new address</button>}
            {showAddressForm && (
              <form className="address-form-card" onSubmit={submitAddress}>
                <div className="address-form-card__heading"><h3>New delivery address</h3><button type="button" onClick={() => setShowAddressForm(false)}>Cancel</button></div>
                <div className="form-row">
                  <label><span>First name</span><input required maxLength={100} value={addressForm.firstName} onChange={(event) => setAddressForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
                  <label><span>Last name</span><input required maxLength={100} value={addressForm.lastName} onChange={(event) => setAddressForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
                </div>
                <label><span>Phone</span><input required type="tel" maxLength={30} value={addressForm.phone} onChange={(event) => setAddressForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                <label><span>Address line 1</span><input required maxLength={250} value={addressForm.addressLine1} onChange={(event) => setAddressForm((current) => ({ ...current, addressLine1: event.target.value }))} /></label>
                <label><span>Address line 2 <small>(optional)</small></span><input maxLength={250} value={addressForm.addressLine2} onChange={(event) => setAddressForm((current) => ({ ...current, addressLine2: event.target.value }))} /></label>
                <div className="form-row form-row--three">
                  <label><span>City</span><input required maxLength={100} value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} /></label>
                  <label><span>State</span><input required maxLength={100} value={addressForm.state} onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))} /></label>
                  <label><span>Postal code</span><input required maxLength={20} value={addressForm.postalCode} onChange={(event) => setAddressForm((current) => ({ ...current, postalCode: event.target.value }))} /></label>
                </div>
                <label><span>Country code</span><input required minLength={2} maxLength={2} value={addressForm.countryCode} onChange={(event) => setAddressForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))} /></label>
                {saveAddressError && <p className="form-error">{saveAddressError}</p>}
                <button className="button button--outline" type="submit" disabled={saveAddressStatus === "loading"}>{saveAddressStatus === "loading" ? "Saving…" : "Save address"}</button>
              </form>
            )}
          </section>

          <section className="checkout-card">
            <div className="checkout-card__heading"><span className="step-number">2</span><div><h2>Payment method</h2><p>Online payments are securely processed by Razorpay.</p></div></div>
            <div className="payment-options">
              <label className="is-selected">
                <input type="radio" name="paymentMethod" value="CARD" checked readOnly />
                <CreditCard size={19} /><span><strong>Pay online</strong><small>Card, UPI, net banking & wallets</small></span><i />
              </label>
            </div>
            <p className="payment-security"><ShieldCheck size={15} /> Your payment details are handled securely by the payment provider.</p>
          </section>

          <section className="checkout-card checkout-products">
            <div className="checkout-card__heading"><span className="step-number">3</span><div><h2>Your items</h2><p>{items.reduce((sum, item) => sum + item.quantity, 0)} item(s) reserved at checkout.</p></div></div>
            {items.map((item) => (
              <div className="checkout-product" key={item.id}>
                <div className="checkout-product__image">{item.laptop.images?.[0]?.url && <img src={item.laptop.images[0].url} alt="" />}</div>
                <div><strong>{item.laptop.title}</strong><span>Qty {item.quantity} · {item.laptop.refurbishmentGrade}</span></div>
                <b>{formatPrice(Number(item.laptop.price) * item.quantity, item.laptop.currency)}</b>
              </div>
            ))}
          </section>
        </div>

        <aside className="order-summary checkout-summary">
          <h2>Order summary</h2>
          <form className="coupon-form" onSubmit={applyCoupon}>
            <label htmlFor="coupon-code">Have a discount code?</label>
            <div><input id="coupon-code" value={couponCode} maxLength={40} onChange={(event) => { setCouponCode(event.target.value); setCoupon(null); setCouponError(""); }} placeholder="Enter code" /><button type="submit" disabled={!couponCode.trim() || couponLoading}>{couponLoading ? "Checking…" : "Apply"}</button></div>
            {couponError && <span className="form-error">{couponError}</span>}
            {coupon && <span className="coupon-success"><Check size={14} /> {coupon.code} applied</span>}
          </form>
          <div><span>Subtotal</span><strong>{formatPrice(subtotal, currency || "USD")}</strong></div>
          {coupon && <div><span>Discount</span><strong className="discount-amount">−{formatPrice(discount, currency)}</strong></div>}
          <div><span>Shipping</span><strong>Free</strong></div>
          <div><span>Taxes</span><strong>Calculated at checkout</strong></div>
          <p>Shipping and taxes are confirmed based on your delivery details.</p>
          <div className="order-summary__total"><span>Total</span><strong>{formatPrice(total, currency || "USD")}</strong></div>
          {placeOrderError && <div className="notice notice--error">{placeOrderError}</div>}
          {checkoutError && <div className="notice notice--error">{checkoutError}</div>}
          <button className="button button--primary button--full checkout-submit" type="button" onClick={completeCheckout} disabled={disabled}>
            {placeOrderStatus === "loading" || paymentStarting ? "Preparing secure checkout…" : "Continue to secure payment"}
            <ArrowRight size={16} />
          </button>
          <div className="summary-assurance"><ShieldCheck size={15} /> Secure checkout <span>·</span> Warranty included</div>
          <Link className="checkout-back-link" to="/cart"><ArrowLeft size={14} /> Return to bag</Link>
        </aside>
      </div>
    </main>
  );
}