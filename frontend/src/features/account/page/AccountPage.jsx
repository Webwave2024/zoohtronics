import { useEffect, useState } from "react";
import { ArrowRight, LogOut, MapPin, Package, Plus, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { signOut, updateAuthenticatedUser } from "../../auth/state/authSlice";
import { fetchAddresses, fetchOrders } from "../../checkout/state/checkoutSlice";
import accountService from "../service/accountService";

const blankAddress = {
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

function AddressFields({ address, setAddress }) {
  function update(event) {
    const { name, value, checked, type } = event.target;
    setAddress((current) => ({ ...current, [name]: type === "checkbox" ? checked : name === "countryCode" ? value.toUpperCase() : value }));
  }

  return (
    <>
      <div className="form-row">
        <label><span>First name</span><input required name="firstName" maxLength={100} autoComplete="given-name" value={address.firstName} onChange={update} /></label>
        <label><span>Last name</span><input required name="lastName" maxLength={100} autoComplete="family-name" value={address.lastName} onChange={update} /></label>
      </div>
      <label><span>Phone</span><input required name="phone" type="tel" maxLength={30} autoComplete="tel" value={address.phone} onChange={update} /></label>
      <label><span>Address line 1</span><input required name="addressLine1" maxLength={250} autoComplete="address-line1" value={address.addressLine1} onChange={update} /></label>
      <label><span>Address line 2 <small>(optional)</small></span><input name="addressLine2" maxLength={250} autoComplete="address-line2" value={address.addressLine2} onChange={update} /></label>
      <div className="form-row form-row--three">
        <label><span>City</span><input required name="city" maxLength={100} autoComplete="address-level2" value={address.city} onChange={update} /></label>
        <label><span>State</span><input required name="state" maxLength={100} autoComplete="address-level1" value={address.state} onChange={update} /></label>
        <label><span>Postal code</span><input required name="postalCode" maxLength={20} autoComplete="postal-code" value={address.postalCode} onChange={update} /></label>
      </div>
      <label><span>Country code</span><input required name="countryCode" minLength={2} maxLength={2} value={address.countryCode} onChange={update} /></label>
      <label className="checkbox-field"><input type="checkbox" name="isDefault" checked={address.isDefault} onChange={update} /> Set as default delivery address</label>
    </>
  );
}

export default function AccountPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { addresses, addressesStatus, addressesError, orders, ordersStatus, ordersError } = useAppSelector((state) => state.checkout);
  const [profile, setProfile] = useState({ firstName: user?.firstName || "", lastName: user?.lastName || "", phone: user?.phone || "" });
  const [address, setAddress] = useState(blankAddress);
  const [profileStatus, setProfileStatus] = useState("idle");
  const [profileError, setProfileError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressStatus, setAddressStatus] = useState("idle");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [passwordStatus, setPasswordStatus] = useState("idle");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    dispatch(fetchAddresses());
    dispatch(fetchOrders());
  }, [dispatch]);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileStatus("loading");
    setProfileError("");
    try {
      const result = await accountService.updateProfile(profile);
      dispatch(updateAuthenticatedUser(result.user));
      setProfileStatus("succeeded");
    } catch (error) {
      setProfileError(error.message);
      setProfileStatus("failed");
    }
  }

  async function saveAddress(event) {
    event.preventDefault();
    setAddressStatus("loading");
    setAddressError("");
    try {
      await accountService.addAddress(address);
      await dispatch(fetchAddresses()).unwrap();
      setAddress(blankAddress);
      setShowAddressForm(false);
      setAddressStatus("succeeded");
    } catch (error) {
      setAddressError(error.message);
      setAddressStatus("failed");
    }
  }

  async function deleteAddress(id) {
    setAddressError("");
    try {
      await accountService.deleteAddress(id);
      await dispatch(fetchAddresses()).unwrap();
    } catch (error) {
      setAddressError(error.message);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordStatus("loading");
    setPasswordError("");
    try {
      await accountService.updatePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setPasswordStatus("succeeded");
    } catch (error) {
      setPasswordError(error.message);
      setPasswordStatus("failed");
    }
  }

  function handleSignOut() {
    dispatch(signOut());
    navigate("/", { replace: true });
  }

  return (
    <main className="commerce-page account-page">
      <div className="commerce-page__heading account-page__heading">
        <div><p className="eyebrow">YOUR ZOHNTRONICS ACCOUNT</p><h1>Hello, {user?.firstName || "there"}.</h1><p>Manage your details, addresses, and recent orders in one place.</p></div>
        <div className="account-page__actions">
          {user?.role === "ADMIN" && <Link className="button button--outline" to="/admin">Open admin panel <ArrowRight size={14} /></Link>}
          <button className="button button--outline" type="button" onClick={handleSignOut}><LogOut size={15} /> Sign out</button>
        </div>
      </div>
      <div className="account-grid">
        <section className="account-panel">
          <div className="account-panel__heading"><span><UserRound size={17} /></span><div><h2>Personal details</h2><p>Your account information.</p></div></div>
          <form className="form-stack" onSubmit={saveProfile}>
            <label><span>Email address</span><input value={user?.email || ""} readOnly /></label>
            <div className="form-row">
              <label><span>First name</span><input required maxLength={100} value={profile.firstName} onChange={(event) => setProfile((current) => ({ ...current, firstName: event.target.value }))} /></label>
              <label><span>Last name</span><input required maxLength={100} value={profile.lastName} onChange={(event) => setProfile((current) => ({ ...current, lastName: event.target.value }))} /></label>
            </div>
            <label><span>Phone <small>(optional)</small></span><input type="tel" maxLength={30} value={profile.phone || ""} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} /></label>
            {profileError && <p className="form-error" role="alert">{profileError}</p>}
            {profileStatus === "succeeded" && <p className="inline-success">Your details are saved.</p>}
            <button className="button button--primary" type="submit" disabled={profileStatus === "loading"}>{profileStatus === "loading" ? "Saving…" : "Save details"}</button>
          </form>
          <div className="account-divider" />
          <div className="account-subheading"><h3>Change password</h3><p>Choose a new password with at least 8 characters.</p></div>
          <form className="form-stack" onSubmit={savePassword}>
            <label><span>Current password</span><input type="password" autoComplete="current-password" minLength={1} maxLength={72} required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} /></label>
            <label><span>New password</span><input type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} /></label>
            {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
            {passwordStatus === "succeeded" && <p className="inline-success">Your password has been changed.</p>}
            <button className="button button--outline" type="submit" disabled={passwordStatus === "loading"}>{passwordStatus === "loading" ? "Updating…" : "Update password"}</button>
          </form>
        </section>

        <section className="account-panel account-panel--orders">
          <div className="account-panel__heading"><span><Package size={17} /></span><div><h2>Recent orders</h2><p>Track orders and manage payment.</p></div></div>
          {ordersError && <p className="notice notice--error">{ordersError}</p>}
          {ordersStatus === "loading" && <p className="form-hint">Loading your orders…</p>}
          {ordersStatus === "succeeded" && !orders.length && <p className="account-empty">No orders yet. Find a laptop that feels right.</p>}
          {orders.slice(0, 5).map((order) => (
            <Link className="account-order-row" to={`/orders/${order.id}`} key={order.id}>
              <span><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item(s)</small></span>
              <span><strong>{order.status.replaceAll("_", " ")}</strong><small>{order.paymentStatus.replaceAll("_", " ")}</small></span>
              <b>{formatAmount(order.totalAmount, order.currency)}</b>
              <ArrowRight size={15} />
            </Link>
          ))}
          {orders.length > 5 && <p className="form-hint">Showing your 5 latest orders.</p>}
        </section>

        <section className="account-panel account-panel--addresses">
          <div className="account-panel__heading"><span><MapPin size={17} /></span><div><h2>Delivery addresses</h2><p>Saved addresses for a faster checkout.</p></div></div>
          {addressesError && <p className="notice notice--error">{addressesError}</p>}
          {addressError && <p className="notice notice--error" role="alert">{addressError}</p>}
          {addressesStatus === "loading" && !addresses.length && <p className="form-hint">Loading saved addresses…</p>}
          {!addresses.length && addressesStatus === "succeeded" && !showAddressForm && <p className="account-empty">No saved addresses yet.</p>}
          <div className="account-addresses">
            {addresses.map((saved) => (
              <article className="account-address" key={saved.id}>
                <div><strong>{saved.firstName} {saved.lastName} {saved.isDefault && <i>DEFAULT</i>}</strong><p>{saved.addressLine1}{saved.addressLine2 ? `, ${saved.addressLine2}` : ""}<br />{saved.city}, {saved.state} {saved.postalCode}, {saved.countryCode}<br />{saved.phone}</p></div>
                <button type="button" onClick={() => deleteAddress(saved.id)}>Remove</button>
              </article>
            ))}
          </div>
          {!showAddressForm && <button className="add-address-toggle" type="button" onClick={() => { setShowAddressForm(true); setAddressError(""); }}><Plus size={16} /> Add an address</button>}
          {showAddressForm && <form className="address-form-card form-stack" onSubmit={saveAddress}>
            <div className="address-form-card__heading"><h3>New address</h3><button type="button" onClick={() => setShowAddressForm(false)}>Cancel</button></div>
            <AddressFields address={address} setAddress={setAddress} />
            <button className="button button--outline" type="submit" disabled={addressStatus === "loading"}>{addressStatus === "loading" ? "Saving…" : "Save address"}</button>
          </form>}
        </section>
      </div>
      <Link className="account-shop-link" to="/">Continue shopping <ArrowRight size={15} /></Link>
    </main>
  );
}

function formatAmount(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
}
