import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { fetchCurrentUser } from "./features/auth/state/authSlice";
import { fetchCart, fetchWishlist, resetCustomerCommerce } from "./features/cart/state/cartSlice";
import { clearCustomerData } from "./features/checkout/state/checkoutSlice";
import "./App.css";
import Footer from "./shared/components/Footer";
import Header from "./shared/components/Header";
import HomePage from "./features/catalog/page/HomePage";
import ProductsPage from "./features/catalog/page/ProductsPage";
import BestSellersPage from "./features/catalog/page/BestSellersPage";
import TrendingPage from "./features/catalog/page/TrendingPage";
import ProductDetailPage from "./features/catalog/page/ProductDetailPage";
import AuthPage from "./features/auth/page/AuthPage";
import CartPage from "./features/cart/page/CartPage";
import SavedPage from "./features/cart/page/SavedPage";
import CheckoutPage from "./features/checkout/page/CheckoutPage";
import AccountPage from "./features/account/page/AccountPage";
import OrderPage from "./features/checkout/page/OrderPage";
import AdminLayout from "./features/admin/page/AdminLayout";
import AdminDashboard from "./features/admin/page/AdminDashboard";
import AdminProducts from "./features/admin/page/AdminProducts";
import AdminOrders from "./features/admin/page/AdminOrders";
import AdminCustomers from "./features/admin/page/AdminCustomers";
import AdminCoupons from "./features/admin/page/AdminCoupons";
import AdminReviews from "./features/admin/page/AdminReviews";
import AdminInquiries from "./features/admin/page/AdminInquiries";
import AdminCategories from "./features/admin/page/AdminCategories";
import CompareModal, { CompareBar } from "./features/catalog/components/CompareModal";

function RequireAuthentication({ children }) {
  const location = useLocation();
  const status = useAppSelector((state) => state.auth.status);
  if (status === "checking" || status === "authenticating") {
    return <main className="account-shell"><div className="state-card"><h3>Checking your account…</h3></div></main>;
  }
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const location = useLocation();
  const { status, user } = useAppSelector((state) => state.auth);
  if (status === "checking" || status === "authenticating") {
    return <main className="account-shell"><div className="state-card"><h3>Checking administrator access…</h3></div></main>;
  }
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user?.role !== "ADMIN" || user?.status !== "ACTIVE") {
    return <main className="account-shell"><div className="state-card state-card--error"><h1>Administrator access required.</h1><p>This account does not have permission to open the store admin panel.</p><a className="button button--outline" href="/">Return to the storefront</a></div></main>;
  }
  return children;
}

function AuthenticationBootstrap() {
  const dispatch = useAppDispatch();
  const { token, status, user } = useAppSelector((state) => state.auth);
  const checkedToken = useRef(null);
  const loadedCommerceToken = useRef(null);

  useEffect(() => {
    if (!token || status !== "checking" || checkedToken.current === token) return;
    checkedToken.current = token;
    dispatch(fetchCurrentUser());
  }, [dispatch, status, token]);

  useEffect(() => {
    if (!token) {
      checkedToken.current = null;
      loadedCommerceToken.current = null;
      dispatch(resetCustomerCommerce());
      dispatch(clearCustomerData());
      return;
    }
    if (status !== "authenticated" || !user || loadedCommerceToken.current === token) return;
    loadedCommerceToken.current = token;
    dispatch(fetchCart());
    dispatch(fetchWishlist());
  }, [dispatch, status, token, user]);

  return null;
}

function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">NOT FOUND</p>
      <h1>This page took a wrong turn.</h1>
      <a className="button button--primary" href="/">Back to Zohntronics</a>
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");
  return (
    <div className={`storefront${isAdminPath ? " storefront--admin" : ""}`}>
      <AuthenticationBootstrap />
      {!isAdminPath && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/best-sellers" element={<BestSellersPage />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/laptops/:id" element={<ProductDetailPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/saved" element={<RequireAuthentication><SavedPage /></RequireAuthentication>} />
        <Route path="/checkout" element={<RequireAuthentication><CheckoutPage /></RequireAuthentication>} />
        <Route path="/account" element={<RequireAuthentication><AccountPage /></RequireAuthentication>} />
        <Route path="/orders/:id" element={<RequireAuthentication><OrderPage /></RequireAuthentication>} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="inquiries" element={<AdminInquiries />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAdminPath && <CompareBar />}
      <CompareModal />
      {!isAdminPath && <Footer />}
    </div>
  );
}
