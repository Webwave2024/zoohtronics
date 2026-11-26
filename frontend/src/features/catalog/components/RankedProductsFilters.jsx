import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { BestSellerCard } from "./BestSellers";
import { gradeLabels } from "../../../shared/format";

const filterFields = [
  ["brand", "Brand"],
  ["ramGB", "RAM"],
  ["storageGB", "Storage"],
  ["processor", "Processor"],
  ["grade", "Condition"],
  ["category", "Category"],
];

function optionValues(products, field) {
  const values = products.flatMap((product) => {
    if (field === "category") return (product.categories || []).map(({ name }) => name);
    if (field === "grade") return product.refurbishmentGrade ? [product.refurbishmentGrade] : [];
    return product[field] === null || product[field] === undefined ? [] : [String(product[field])];
  });
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true })
  );
}

function fieldOptionLabel(field, value) {
  if (field === "ramGB") return `${value} GB RAM`;
  if (field === "storageGB") return `${value} GB Storage`;
  if (field === "grade") return gradeLabels[value] || value;
  return value;
}

export default function RankedProductsFilters({
  products = [],
  fallback,
  metricLabel,
  fallbackLabel,
}) {
  const [selected, setSelected] = useState({});
  const [openSections, setOpenSections] = useState({
    brand: true,
    ramGB: true,
    storageGB: false,
    processor: false,
    grade: true,
    category: false,
  });
  const [brandSearch, setBrandSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const availableOptions = useMemo(() => {
    return filterFields.reduce((accumulator, [field]) => {
      accumulator[field] = optionValues(products, field);
      return accumulator;
    }, {});
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      return Object.entries(selected).every(([field, values]) => {
        if (!values || values.length === 0) return true;
        if (field === "category") {
          const names = (product.categories || []).map(({ name }) => name);
          return values.some((value) => names.includes(value));
        }
        if (field === "grade") {
          return values.includes(product.refurbishmentGrade);
        }
        return values.includes(String(product[field]));
      });
    });

    if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "ram-desc") {
      result = [...result].sort((a, b) => (Number(b.ramGB) || 0) - (Number(a.ramGB) || 0));
    }

    return result;
  }, [products, selected, sortBy]);

  function toggleSection(field) {
    setOpenSections((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function toggleFilter(field, value) {
    setSelected((current) => {
      const active = current[field] || [];
      const next = active.includes(value)
        ? active.filter((item) => item !== value)
        : [...active, value];
      return { ...current, [field]: next };
    });
  }

  function clearAll() {
    setSelected({});
    setBrandSearch("");
  }

  const activeCount = Object.values(selected).reduce(
    (sum, values) => sum + (values?.length || 0),
    0
  );

  return (
    <div className="ranked-filter-layout">
      {/* Sidebar Filter Panel */}
      <aside className="ranked-filter-sidebar" aria-label="Filter products">
        <div className="ranked-filter-sidebar__header">
          <div className="ranked-filter-sidebar__title">
            <SlidersHorizontal size={17} />
            <span>Filters</span>
            {activeCount > 0 && <span className="ranked-filter-badge">{activeCount}</span>}
          </div>
          {activeCount > 0 && (
            <button
              className="ranked-filter-clear-btn"
              type="button"
              onClick={clearAll}
            >
              <RotateCcw size={12} /> Clear all
            </button>
          )}
        </div>

        <div className="ranked-filter-groups">
          {filterFields.map(([field, label]) => {
            let options = availableOptions[field] || [];
            if (options.length === 0) return null;

            if (field === "brand" && brandSearch.trim()) {
              options = options.filter((opt) =>
                opt.toLowerCase().includes(brandSearch.toLowerCase())
              );
            }

            const activeValues = selected[field] || [];
            const isOpen = openSections[field] ?? false;

            return (
              <div className="ranked-filter-group" key={field}>
                <button
                  type="button"
                  className="ranked-filter-group__header"
                  onClick={() => toggleSection(field)}
                  aria-expanded={isOpen}
                >
                  <span className="ranked-filter-group__label">
                    {label}
                    {activeValues.length > 0 && (
                      <span className="ranked-filter-group__count">
                        ({activeValues.length})
                      </span>
                    )}
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isOpen && (
                  <div className="ranked-filter-group__content">
                    {field === "brand" && (availableOptions[field]?.length || 0) > 4 && (
                      <div className="ranked-filter-search">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Search brands..."
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                        />
                        {brandSearch && (
                          <button
                            type="button"
                            onClick={() => setBrandSearch("")}
                            className="ranked-filter-search__clear"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="ranked-filter-options">
                      {options.map((value) => {
                        const checked = activeValues.includes(value);
                        const count = products.filter((p) => {
                          if (field === "category") {
                            return (p.categories || []).some((c) => c.name === value);
                          }
                          if (field === "grade") {
                            return p.refurbishmentGrade === value;
                          }
                          return String(p[field]) === value;
                        }).length;

                        return (
                          <label key={value} className="ranked-filter-option">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFilter(field, value)}
                            />
                            <span className="ranked-filter-option__name">
                              {fieldOptionLabel(field, value)}
                            </span>
                            <span className="ranked-filter-option__count">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Results Column */}
      <section className="ranked-filter-results">
        <div className="ranked-filter-toolbar">
          <div className="ranked-filter-count">
            Showing <strong>{filtered.length}</strong> of {products.length} laptops
            {activeCount > 0 && <span> (Filtered)</span>}
          </div>

          <div className="ranked-filter-sort">
            <label htmlFor="ranked-sort-select">Sort by:</label>
            <select
              id="ranked-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="default">Ranked (Best Volume)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="ram-desc">RAM: Highest First</option>
            </select>
          </div>
        </div>

        {/* Active Filter Pills Bar */}
        {activeCount > 0 && (
          <div className="ranked-active-pills">
            {Object.entries(selected).map(([field, values]) =>
              values.map((val) => (
                <button
                  key={`${field}-${val}`}
                  type="button"
                  className="ranked-pill"
                  onClick={() => toggleFilter(field, val)}
                  title="Remove filter"
                >
                  <span>{fieldOptionLabel(field, val)}</span>
                  <X size={12} />
                </button>
              ))
            )}
            <button
              type="button"
              className="ranked-pill ranked-pill--clear"
              onClick={clearAll}
            >
              Clear All
            </button>
          </div>
        )}

        {/* Product Cards Grid */}
        {filtered.length === 0 ? (
          <div className="ranked-filter-empty">
            <div className="state-card">
              <h3>No laptops match your filters</h3>
              <p>Try unchecking some filters or reset to see all available models.</p>
              <button
                className="button button--primary"
                type="button"
                onClick={clearAll}
              >
                Clear all filters
              </button>
            </div>
          </div>
        ) : (
          <div className="ranked-products-grid">
            {filtered.map((product) => (
              <BestSellerCard
                key={product.id}
                product={product}
                fallback={fallback}
                metricLabel={metricLabel}
                fallbackLabel={fallbackLabel}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
