import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  clearCatalogQuery,
  fetchFilters,
  fetchProducts,
  setCatalogPage,
  setCatalogQuery,
} from "../state/catalogSlice";
import { BestSellerCard } from "../components/BestSellers";

const gradeLabels = {
  LIKE_NEW: "Like new",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
};

const initialOpenSections = {
  availability: true,
  popularity: false,
  brand: true,
  ram: false,
  storage: false,
  processor: false,
  categories: false,
  condition: false,
  price: true,
};

function parseList(value = "") {
  return value ? value.split(",").filter(Boolean) : [];
}

function FilterGroup({ id, title, open, onToggle, children }) {
  return (
    <section className="product-filter-group">
      <button
        className="product-filter-group__toggle"
        type="button"
        aria-expanded={open}
        aria-controls={`filter-content-${id}`}
        onClick={onToggle}
      >
        <span>{title}</span>
        {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>
      {open && <div className="product-filter-group__content" id={`filter-content-${id}`}>{children}</div>}
    </section>
  );
}

function CheckboxOptions({ name, options, selected, onToggle }) {
  return (
    <div className="product-filter-options">
      {options.map((option) => {
        const value = String(option.value);
        return (
          <label className="product-filter-option" key={value}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onToggle(name, value)}
            />
            <span>{option.label}</span>
            {option.count !== undefined && <small>{option.count}</small>}
          </label>
        );
      })}
    </div>
  );
}

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const {
    products,
    pagination,
    filters,
    query,
    productsStatus,
    filtersStatus,
    productsError,
    filtersError,
  } = useAppSelector((state) => state.catalog);
  const [draft, setDraft] = useState(() => ({
    brands: parseList(query.brands || query.brand),
    popularity: parseList(query.popularity),
    ramGB: parseList(query.ramGB),
    storageGB: parseList(query.storageGB),
    processors: parseList(query.processors),
    categories: parseList(query.categories || query.category),
    grades: parseList(query.grades || query.grade),
    inStock: query.inStock === "true",
    minPrice: query.minPrice ?? "",
    maxPrice: query.maxPrice ?? "",
    sort: query.sort || "newest",
  }));
  const [brandSearch, setBrandSearch] = useState("");
  const [openSections, setOpenSections] = useState(initialOpenSections);

  useEffect(() => {
    const urlQuery = {};
    if (searchParams.has("brands")) urlQuery.brands = searchParams.get("brands");
    if (searchParams.has("categories")) urlQuery.categories = searchParams.get("categories");
    if (searchParams.has("minPrice")) urlQuery.minPrice = Number(searchParams.get("minPrice"));
    if (searchParams.has("maxPrice")) urlQuery.maxPrice = Number(searchParams.get("maxPrice"));
    if (searchParams.has("search")) urlQuery.search = searchParams.get("search");
    if (Object.keys(urlQuery).length > 0) {
      dispatch(setCatalogQuery(urlQuery));
    }
  }, [searchParams, dispatch]);

  useEffect(() => {
    setDraft({
      brands: parseList(query.brands || query.brand),
      popularity: parseList(query.popularity),
      ramGB: parseList(query.ramGB),
      storageGB: parseList(query.storageGB),
      processors: parseList(query.processors),
      categories: parseList(query.categories || query.category),
      grades: parseList(query.grades || query.grade),
      inStock: query.inStock === "true",
      minPrice: query.minPrice ?? "",
      maxPrice: query.maxPrice ?? "",
      sort: query.sort || "newest",
    });

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      setOpenSections((prev) => ({ ...prev, price: true }));
    }
    if (query.categories || query.category) {
      setOpenSections((prev) => ({ ...prev, categories: true }));
    }
    if (query.brands || query.brand) {
      setOpenSections((prev) => ({ ...prev, brand: true }));
    }
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    dispatch(fetchFilters(undefined, { signal: controller.signal }));
    return () => controller.abort();
  }, [dispatch]);

  useEffect(() => {
    const controller = new AbortController();
    dispatch(fetchProducts({ ...query, pageSize: 12 }, { signal: controller.signal }));
    return () => controller.abort();
  }, [dispatch, query]);

  const selectedCount = draft.brands.length + draft.ramGB.length + draft.storageGB.length +
    draft.processors.length + draft.categories.length + draft.grades.length +
    draft.popularity.length +
    Number(draft.inStock) + Number(draft.minPrice !== "") + Number(draft.maxPrice !== "");
  const visibleBrands = useMemo(
    () => filters?.brands.filter(({ name }) => name.toLowerCase().includes(brandSearch.trim().toLowerCase())) || [],
    [brandSearch, filters],
  );
  const maxAvailablePrice = Number(filters?.price?.max || 0);
  const minAvailablePrice = Number(filters?.price?.min || 0);

  function toggleSection(section) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  }

  function toggleOption(group, value) {
    setDraft((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value],
    }));
  }

  function applyFilters(event) {
    event.preventDefault();
    dispatch(setCatalogQuery({
      brands: draft.brands.join(","),
      popularity: draft.popularity.join(","),
      ramGB: draft.ramGB.join(","),
      storageGB: draft.storageGB.join(","),
      processors: draft.processors.join(","),
      categories: draft.categories.join(","),
      grades: draft.grades.join(","),
      inStock: draft.inStock ? "true" : "",
      minPrice: draft.minPrice === "" ? "" : Number(draft.minPrice),
      maxPrice: draft.maxPrice === "" ? "" : Number(draft.maxPrice),
      sort: draft.sort,
    }));
  }

  function resetFilters() {
    setDraft({
      brands: [],
      popularity: [],
      ramGB: [],
      storageGB: [],
      processors: [],
      categories: [],
      grades: [],
      inStock: false,
      minPrice: "",
      maxPrice: "",
      sort: "newest",
    });
    setBrandSearch("");
    dispatch(clearCatalogQuery());
  }

  function setPricePreset(maxPrice) {
    setDraft((current) => ({ ...current, maxPrice: String(maxPrice) }));
  }

  return (
    <main className="products-page">
      <Link className="best-sellers-page__back" to="/">
        <ArrowLeft size={16} /> Back to home
      </Link>
      <header className="best-sellers-page__heading">
        <p className="eyebrow"><span />THE COMPLETE COLLECTION</p>
        <h1>All <em>Products</em></h1>
        <p>Browse our available refurbished laptops and find the right fit.</p>
        {pagination && <span>{pagination.total} {pagination.total === 1 ? "laptop" : "laptops"}</span>}
      </header>

      <div className="products-page__layout">
        <aside className="products-filter-sidebar">
          <div className="products-filter-sidebar__heading">
            <strong>Filters</strong>
            {selectedCount > 0 && <button type="button" onClick={resetFilters}>Clear all</button>}
          </div>
          {filtersError && <p className="filter-error" role="status">{filtersError}</p>}
          <form onSubmit={applyFilters}>
            <FilterGroup
              id="availability"
              title="Availability"
              open={openSections.availability}
              onToggle={() => toggleSection("availability")}
            >
              <label className="product-filter-option">
                <input
                  type="checkbox"
                  checked={draft.inStock}
                  onChange={(event) => setDraft((current) => ({ ...current, inStock: event.target.checked }))}
                />
                <span>In stock</span>
              </label>
            </FilterGroup>

            <FilterGroup
              id="popularity"
              title="Popularity"
              open={openSections.popularity}
              onToggle={() => toggleSection("popularity")}
            >
              <CheckboxOptions
                name="popularity"
                options={[
                  { value: "best-seller", label: "Best Seller" },
                  { value: "trending", label: "Trending" },
                ]}
                selected={draft.popularity}
                onToggle={toggleOption}
              />
            </FilterGroup>

            <FilterGroup id="brand" title="Brand" open={openSections.brand} onToggle={() => toggleSection("brand")}>
              <label className="product-filter-search">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search brand..."
                  value={brandSearch}
                  onChange={(event) => setBrandSearch(event.target.value)}
                />
              </label>
              <CheckboxOptions
                name="brands"
                options={visibleBrands.map((brand) => ({ value: brand.name, label: brand.name, count: brand.count }))}
                selected={draft.brands}
                onToggle={toggleOption}
              />
            </FilterGroup>

            <FilterGroup id="ram" title="RAM" open={openSections.ram} onToggle={() => toggleSection("ram")}>
              <CheckboxOptions
                name="ramGB"
                options={(filters?.ram || []).map((option) => ({ value: option.value, label: `${option.value} GB`, count: option.count }))}
                selected={draft.ramGB}
                onToggle={toggleOption}
              />
            </FilterGroup>

            <FilterGroup id="storage" title="Storage" open={openSections.storage} onToggle={() => toggleSection("storage")}>
              <CheckboxOptions
                name="storageGB"
                options={(filters?.storage || []).map((option) => ({ value: option.value, label: `${option.value} GB`, count: option.count }))}
                selected={draft.storageGB}
                onToggle={toggleOption}
              />
            </FilterGroup>

            <FilterGroup id="processor" title="Processor" open={openSections.processor} onToggle={() => toggleSection("processor")}>
              <CheckboxOptions
                name="processors"
                options={(filters?.processors || []).map((option) => ({ value: option.value, label: option.value, count: option.count }))}
                selected={draft.processors}
                onToggle={toggleOption}
              />
            </FilterGroup>

            <FilterGroup id="categories" title="Categories" open={openSections.categories} onToggle={() => toggleSection("categories")}>
              <CheckboxOptions
                name="categories"
                options={(filters?.categories || []).map((category) => ({ value: category.slug, label: category.name, count: category.count }))}
                selected={draft.categories}
                onToggle={toggleOption}
              />
            </FilterGroup>

            <FilterGroup id="condition" title="Condition" open={openSections.condition} onToggle={() => toggleSection("condition")}>
              <CheckboxOptions
                name="grades"
                options={(filters?.grades || []).map((grade) => ({ value: grade.value, label: gradeLabels[grade.value] || grade.value, count: grade.count }))}
                selected={draft.grades}
                onToggle={toggleOption}
              />
            </FilterGroup>

            <FilterGroup id="price" title="Price Range" open={openSections.price} onToggle={() => toggleSection("price")}>
              <div className="price-filter-chart" aria-hidden="true">
                {[28, 44, 58, 72, 49, 60, 83, 66, 33, 23, 14, 8].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="price-filter-bounds">
                <span>{minAvailablePrice.toLocaleString()}</span>
                <span>{maxAvailablePrice.toLocaleString()}</span>
              </div>
              <div className="price-filter-presets">
                {[20000, 30000, 50000].map((price) => (
                  <button key={price} type="button" onClick={() => setPricePreset(price)}>
                    Under {price / 1000}K
                  </button>
                ))}
              </div>
              <div className="product-price-inputs">
                <label>
                  <span className="sr-only">Minimum price</span>
                  <input
                    min="0"
                    type="number"
                    placeholder={String(minAvailablePrice)}
                    value={draft.minPrice}
                    onChange={(event) => setDraft((current) => ({ ...current, minPrice: event.target.value }))}
                  />
                </label>
                <span>–</span>
                <label>
                  <span className="sr-only">Maximum price</span>
                  <input
                    min="0"
                    type="number"
                    placeholder={String(maxAvailablePrice)}
                    value={draft.maxPrice}
                    onChange={(event) => setDraft((current) => ({ ...current, maxPrice: event.target.value }))}
                  />
                </label>
              </div>
            </FilterGroup>

            <button className="button button--primary button--full products-filter-apply" type="submit">
              Apply filters
            </button>
          </form>
        </aside>

        <section className="catalog-results products-page__results" aria-label="Filtered laptops">
          <div className="catalog-toolbar">
            <span>{query.search ? `Results for “${query.search}”` : "All refurbished laptops"}</span>
            <label>
              <span className="sr-only">Sort laptops</span>
              <select value={draft.sort} onChange={(event) => {
                const sort = event.target.value;
                setDraft((current) => ({ ...current, sort }));
                dispatch(setCatalogQuery({ sort }));
              }}>
                <option value="newest">Sort: newest</option>
                <option value="price_asc">Sort: price low to high</option>
                <option value="price_desc">Sort: price high to low</option>
              </select>
            </label>
          </div>
          {productsError ? (
            <div className="state-card state-card--error" role="alert">
              <h2>We couldn’t load the collection.</h2>
              <p>{productsError}</p>
              <button className="button button--outline" type="button" onClick={() => dispatch(fetchProducts({ ...query, pageSize: 12 }))}>Try again</button>
            </div>
          ) : productsStatus === "loading" || filtersStatus === "loading" && !filters ? (
            <div className="best-sellers__grid products-page__grid" aria-label="Loading products">
              {Array.from({ length: 8 }, (_, index) => <div className="best-seller-skeleton" key={index} />)}
            </div>
          ) : products.length ? (
            <>
              <div className="best-sellers__grid products-page__grid">
                {products.map((product) => (
                  <BestSellerCard
                    key={product.id}
                    product={product}
                    fallback
                    fallbackLabel={product.featured ? "Featured pick" : "Available now"}
                  />
                ))}
              </div>
              {pagination?.pages > 1 && (
                <nav className="pagination" aria-label="Catalog pages">
                  <button type="button" disabled={pagination.page <= 1} onClick={() => dispatch(setCatalogPage(pagination.page - 1))}><ChevronLeft size={18} /> Previous</button>
                  <span>Page <strong>{pagination.page}</strong> of {pagination.pages}</span>
                  <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => dispatch(setCatalogPage(pagination.page + 1))}>Next <ChevronRight size={18} /></button>
                </nav>
              )}
            </>
          ) : (
            <div className="state-card">
              <h2>No laptops match just yet.</h2>
              <p>Try broadening your search or adjusting your filters.</p>
              <button className="button button--outline" type="button" onClick={resetFilters}>Clear filters</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
