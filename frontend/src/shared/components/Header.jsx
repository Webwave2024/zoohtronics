import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Laptop,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  clearCatalogQuery,
  clearSuggestions,
  fetchFilters,
  fetchSuggestions,
  setCatalogQuery,
} from "../../features/catalog/state/catalogSlice";
import { formatPrice } from "../format";
import Brand from "./Brand";

export default function Header() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    filters,
    filtersStatus,
    suggestions,
    suggestionsStatus,
    suggestionsError,
  } = useAppSelector((state) => state.catalog);
  const cart = useAppSelector((state) => state.cart.cart);
  const wishlist = useAppSelector((state) => state.cart.wishlist);
  const authStatus = useAppSelector((state) => state.auth.status);
  const user = useAppSelector((state) => state.auth.user);
  const [term, setTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeNavMenu, setActiveNavMenu] = useState(null);
  const searchRef = useRef(null);
  const navRef = useRef(null);
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  useEffect(() => {
    if (!filters && filtersStatus === "idle") {
      dispatch(fetchFilters());
    }
  }, [dispatch, filters, filtersStatus]);

  useEffect(() => {
    const query = term.trim();
    if (!searchOpen || query.length < 2) {
      dispatch(clearSuggestions());
      return undefined;
    }
    const timer = window.setTimeout(() => dispatch(fetchSuggestions(query)), 250);
    return () => window.clearTimeout(timer);
  }, [dispatch, searchOpen, term]);

  useEffect(() => {
    function dismiss(event) {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
      if (!navRef.current?.contains(event.target)) setActiveNavMenu(null);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setActiveNavMenu(null);
        setSearchOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function submitSearch(value = term) {
    const search = value.trim();
    dispatch(setCatalogQuery({ search, page: 1 }));
    setTerm(search);
    setSearchOpen(false);
    dispatch(clearSuggestions());
    navigate("/");
    window.setTimeout(() => document.querySelector("#featured")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function openPrivatePage(path) {
    if (authStatus === "authenticated") navigate(path);
    else navigate("/login", { state: { from: { pathname: path } } });
  }

  function handleSelectAllProducts() {
    dispatch(clearCatalogQuery());
    setActiveNavMenu(null);
    navigate("/products");
  }

  function handleSelectCategory(category) {
    dispatch(setCatalogQuery({
      categories: category.slug,
      brands: "",
      minPrice: "",
      maxPrice: "",
      search: "",
      page: 1,
    }));
    setActiveNavMenu(null);
    navigate(`/products?categories=${encodeURIComponent(category.slug)}`);
  }

  function handleSelectBrand(brandName) {
    dispatch(setCatalogQuery({
      brands: brandName,
      categories: "",
      minPrice: "",
      maxPrice: "",
      search: "",
      page: 1,
    }));
    setActiveNavMenu(null);
    navigate(`/products?brands=${encodeURIComponent(brandName)}`);
  }

  function handleSelectBudget(tier) {
    dispatch(setCatalogQuery({
      minPrice: tier.minPrice > 0 ? tier.minPrice : "",
      maxPrice: tier.maxPrice !== null ? tier.maxPrice : "",
      brands: "",
      categories: "",
      search: "",
      page: 1,
    }));
    setActiveNavMenu(null);
    const params = new URLSearchParams();
    if (tier.minPrice > 0) params.set("minPrice", tier.minPrice);
    if (tier.maxPrice !== null) params.set("maxPrice", tier.maxPrice);
    navigate(`/products?${params.toString()}`);
  }

  const availableCategories = useMemo(
    () => (filters?.categories || []).filter((c) => c.count > 0),
    [filters],
  );

  const availableBrands = useMemo(
    () => (filters?.brands || []).filter((b) => b.count > 0),
    [filters],
  );

  const appleBrand = useMemo(
    () => availableBrands.find((b) => b.name.toLowerCase() === "apple"),
    [availableBrands],
  );

  const pcBrands = useMemo(
    () => availableBrands.filter((b) => b.name.toLowerCase() !== "apple"),
    [availableBrands],
  );

  const pcLaptopsCount = useMemo(
    () => pcBrands.reduce((sum, b) => sum + b.count, 0),
    [pcBrands],
  );

  const totalProductsCount = useMemo(
    () => availableBrands.reduce((sum, b) => sum + b.count, 0),
    [availableBrands],
  );

  function handleSelectWindowsLaptops() {
    const pcBrandNames = pcBrands.map((b) => b.name).join(",");
    dispatch(setCatalogQuery({
      brands: pcBrandNames,
      categories: "",
      minPrice: "",
      maxPrice: "",
      search: "",
      page: 1,
    }));
    setActiveNavMenu(null);
    navigate(`/products?brands=${encodeURIComponent(pcBrandNames)}`);
  }

  const availableBudgets = useMemo(() => {
    if (filters?.budgets?.length) {
      return filters.budgets.filter((b) => b.count > 0);
    }
    const minP = Number(filters?.price?.min ?? 0);
    const maxP = Number(filters?.price?.max ?? 0);
    if (!filters?.price || maxP === 0) return [];

    const defaultTiers = [
      { label: "Under 20k", minPrice: 0, maxPrice: 20000 },
      { label: "20k - 30k", minPrice: 20000, maxPrice: 30000 },
      { label: "30k - 40k", minPrice: 30000, maxPrice: 40000 },
      { label: "40k - 50k", minPrice: 40000, maxPrice: 50000 },
      { label: "Above 50k", minPrice: 50000, maxPrice: null },
    ];

    return defaultTiers.filter((tier) => {
      if (tier.maxPrice !== null && minP > tier.maxPrice) return false;
      if (tier.minPrice > 0 && maxP < tier.minPrice) return false;
      return true;
    });
  }, [filters]);

  return (
    <>
      <div className="announcement">
        <span>Quality-checked refurbished tech</span>
        <span className="announcement__divider" />
        <span>A smarter second life for your next laptop</span>
      </div>
      <header className="site-header">
        <div className="site-header__inner">
          <Brand />
          <nav className="main-nav" ref={navRef} aria-label="Main navigation">
            <div className="nav-dropdown-item">
              <button
                type="button"
                className={`nav-link-btn ${activeNavMenu === "products" ? "is-active" : ""}`}
                onClick={() => setActiveNavMenu((curr) => (curr === "products" ? null : "products"))}
                aria-expanded={activeNavMenu === "products"}
                aria-haspopup="true"
              >
                <span>Products</span>
                <ChevronDown size={14} className={`nav-chevron ${activeNavMenu === "products" ? "is-open" : ""}`} />
              </button>

              {activeNavMenu === "products" && (
                <div className="nav-dropdown-menu nav-dropdown-menu--products" role="menu">
                  <button
                    type="button"
                    className="nav-dropdown-link nav-dropdown-link--featured"
                    onClick={handleSelectAllProducts}
                  >
                    <div className="nav-dropdown-link__left">
                      <Sparkles size={15} />
                      <strong>All Products</strong>
                    </div>
                    {totalProductsCount > 0 && <span className="nav-badge">{totalProductsCount} in stock</span>}
                  </button>

                  {(appleBrand || pcLaptopsCount > 0) && (
                    <div className="nav-dropdown-group">
                      <span className="nav-dropdown-section-title">Product Types</span>
                      {appleBrand && (
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleSelectBrand(appleBrand.name)}
                        >
                          <div className="nav-dropdown-link__left">
                            <span className="nav-brand-symbol"></span>
                            <span>Mac / MacBook</span>
                          </div>
                          <span className="nav-badge">{appleBrand.count}</span>
                        </button>
                      )}
                      {pcLaptopsCount > 0 && (
                        <button
                          type="button"
                          className="nav-dropdown-link"
                          onClick={handleSelectWindowsLaptops}
                        >
                          <div className="nav-dropdown-link__left">
                            <Laptop size={15} />
                            <span>Windows Laptops</span>
                          </div>
                          <span className="nav-badge">{pcLaptopsCount}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {availableCategories.length > 0 && (
                    <div className="nav-dropdown-group">
                      <span className="nav-dropdown-section-title">Categories</span>
                      {availableCategories.map((cat) => (
                        <button
                          key={cat.id || cat.slug}
                          type="button"
                          className="nav-dropdown-link"
                          onClick={() => handleSelectCategory(cat)}
                        >
                          <div className="nav-dropdown-link__left">
                            <span>{cat.name}</span>
                          </div>
                          <span className="nav-badge">{cat.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!appleBrand && pcLaptopsCount === 0 && availableCategories.length === 0 && (
                    <p className="nav-dropdown-empty">
                      {filtersStatus === "loading" ? "Loading catalog…" : "No products currently available"}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="nav-dropdown-item">
              <button
                type="button"
                className={`nav-link-btn ${activeNavMenu === "brands" ? "is-active" : ""}`}
                onClick={() => setActiveNavMenu((curr) => (curr === "brands" ? null : "brands"))}
                aria-expanded={activeNavMenu === "brands"}
                aria-haspopup="true"
              >
                <span>Brands</span>
                <ChevronDown size={14} className={`nav-chevron ${activeNavMenu === "brands" ? "is-open" : ""}`} />
              </button>

              {activeNavMenu === "brands" && (
                <div className="nav-dropdown-menu" role="menu">
                  <div className="nav-dropdown-header">Available Brands</div>
                  {availableBrands.length > 0 ? (
                    availableBrands.map((brand) => (
                      <button
                        key={brand.name}
                        type="button"
                        className="nav-dropdown-link"
                        onClick={() => handleSelectBrand(brand.name)}
                      >
                        <span>{brand.name}</span>
                        <span className="nav-badge">{brand.count}</span>
                      </button>
                    ))
                  ) : (
                    <p className="nav-dropdown-empty">
                      {filtersStatus === "loading" ? "Loading brands…" : "No brands currently in stock"}
                    </p>
                  )}
                  <button
                    type="button"
                    className="nav-dropdown-link nav-dropdown-link--view-all"
                    onClick={handleSelectAllProducts}
                  >
                    <span>Browse all laptops</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>

            <div className="nav-dropdown-item">
              <button
                type="button"
                className={`nav-link-btn ${activeNavMenu === "budget" ? "is-active" : ""}`}
                onClick={() => setActiveNavMenu((curr) => (curr === "budget" ? null : "budget"))}
                aria-expanded={activeNavMenu === "budget"}
                aria-haspopup="true"
              >
                <span>Buy Budget</span>
                <ChevronDown size={14} className={`nav-chevron ${activeNavMenu === "budget" ? "is-open" : ""}`} />
              </button>

              {activeNavMenu === "budget" && (
                <div className="nav-dropdown-menu nav-dropdown-menu--budget" role="menu">
                  <div className="nav-dropdown-header">Shop by Budget</div>
                  {availableBudgets.length > 0 ? (
                    availableBudgets.map((tier) => (
                      <button
                        key={tier.label}
                        type="button"
                        className="nav-dropdown-link"
                        onClick={() => handleSelectBudget(tier)}
                      >
                        <div className="nav-dropdown-link__left">
                          <Tag size={14} />
                          <span className="nav-budget-label">{tier.label}</span>
                        </div>
                        {tier.count !== undefined && tier.count > 0 && (
                          <span className="nav-badge">{tier.count}</span>
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="nav-dropdown-empty">
                      {filtersStatus === "loading" ? "Loading prices…" : "No budget ranges available"}
                    </p>
                  )}
                  <button
                    type="button"
                    className="nav-dropdown-link nav-dropdown-link--view-all"
                    onClick={handleSelectAllProducts}
                  >
                    <span>All price ranges</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          </nav>
          <div className="header-actions">
            <div className="search-wrap" ref={searchRef}>
              <form className="header-search" role="search" onSubmit={(event) => { event.preventDefault(); submitSearch(); }}>
                <Search className="header-search__icon" size={18} aria-hidden="true" />
                <input
                  aria-label="Search laptops"
                  aria-autocomplete="list"
                  aria-expanded={searchOpen && term.trim().length >= 2}
                  autoComplete="off"
                  onChange={(event) => { setTerm(event.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setSearchOpen(false);
                    if (event.key === "ArrowDown" && suggestions.length) {
                      event.preventDefault();
                      document.querySelector(".search-suggestion")?.focus();
                    }
                  }}
                  placeholder="Search laptops, brands, or specs"
                  value={term}
                />
                {term && <button className="search-clear" type="button" aria-label="Clear search" onClick={() => { setTerm(""); dispatch(clearSuggestions()); }}>×</button>}
                <button className="header-search__submit" type="submit" aria-label="Search">
                  <Search size={16} aria-hidden="true" />
                </button>
              </form>
              {searchOpen && term.trim().length >= 2 && (
                <div className="search-dropdown">
                  {suggestionsStatus === "loading" && <p className="search-dropdown__state">Finding your match…</p>}
                  {suggestionsStatus === "failed" && <p className="search-dropdown__state">{suggestionsError}</p>}
                  {suggestionsStatus === "succeeded" && suggestions.length === 0 && <p className="search-dropdown__state">No suggestions yet. Search all products instead.</p>}
                  {suggestions.map((product) => (
                    <Link className="search-suggestion" to={`/laptops/${product.id}`} key={product.id} onClick={() => setSearchOpen(false)}>
                      {product.images?.[0]?.url ? <img src={product.images[0].url} alt="" /> : <div className="search-suggestion__placeholder">Z</div>}
                      <span><strong>{product.title}</strong><small>{product.brand} · {product.model}</small></span>
                      <b>{formatPrice(product.price, product.currency)}</b>
                    </Link>
                  ))}
                  <button className="search-all" type="button" onClick={() => submitSearch()}>View all results for “{term.trim()}”</button>
                </div>
              )}
            </div>
            <button className="icon-button header-action" type="button" aria-label={`Wishlist, ${wishlist.length} saved`} onClick={() => openPrivatePage("/saved")}>
              <Heart size={20} /><span className="header-action__label">Saved</span>{wishlist.length > 0 && <i>{wishlist.length}</i>}
            </button>
            <button className="icon-button header-action" type="button" aria-label={`Shopping cart, ${itemCount} items`} onClick={() => navigate("/cart")}>
              <ShoppingBag size={20} /><span className="header-action__label">Bag</span>{itemCount > 0 && <i>{itemCount}</i>}
            </button>
            <button className="icon-button header-action account-action" type="button" aria-label={user ? "Your account" : "Sign in"} onClick={() => openPrivatePage("/account")}>
              <UserRound size={19} /><span className="header-action__label">{user?.firstName || "Account"}</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
