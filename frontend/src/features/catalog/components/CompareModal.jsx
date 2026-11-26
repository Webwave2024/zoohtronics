import { Check, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  closeCompareModal,
  openCompareModal,
  removeCompareItem,
  clearCompareItems,
} from "../state/compareSlice";
import { addCartItem } from "../../cart/state/cartSlice";
import { formatPrice, gradeLabels } from "../../../shared/format";

export function CompareBar() {
  const dispatch = useAppDispatch();
  const compareItems = useAppSelector((state) => state.compare?.compareItems || []);

  if (compareItems.length === 0) return null;

  return (
    <aside className="compare-bar" aria-label="Compare items bar">
      <div className="compare-bar__inner">
        <div className="compare-bar__items">
          {compareItems.map((item) => {
            const img = item.images?.[0];
            const url = typeof img === "string" ? img : img?.url;
            return (
              <div className="compare-bar__thumb" key={item.id} title={item.title}>
                {url ? <img src={url} alt={item.title} /> : <span>{item.brand?.[0]}</span>}
                <button
                  type="button"
                  className="compare-bar__thumb-remove"
                  onClick={() => dispatch(removeCompareItem(item.id))}
                  aria-label={`Remove ${item.title}`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          <div className="compare-bar__info">
            <strong>{compareItems.length} laptop{compareItems.length > 1 ? "s" : ""}</strong>
            <span>selected to compare</span>
          </div>
        </div>

        <div className="compare-bar__actions">
          <button
            type="button"
            className="button button--primary compare-bar__btn"
            onClick={() => dispatch(openCompareModal())}
          >
            Compare Now
          </button>
          <button
            type="button"
            className="compare-bar__clear"
            onClick={() => dispatch(clearCompareItems())}
          >
            Clear All
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function CompareModal() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { compareItems = [], isModalOpen = false } = useAppSelector(
    (state) => state.compare || {}
  );
  const authenticated = useAppSelector((state) => state.auth.status === "authenticated");
  const cartStatus = useAppSelector((state) => state.cart.cartStatus);

  if (!isModalOpen || compareItems.length === 0) return null;

  async function handleAddToCart(item) {
    await dispatch(addCartItem({ laptopId: item.id, quantity: 1, product: item }));
  }

  const specRows = [
    { label: "Price", render: (p) => (
      <div>
        <strong className="compare-table__price">{formatPrice(p.price, p.currency)}</strong>
        {p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) && (
          <del className="compare-table__del">{formatPrice(p.compareAtPrice, p.currency)}</del>
        )}
      </div>
    )},
    { label: "Brand", render: (p) => p.brand || "—" },
    { label: "Model", render: (p) => p.model || "—" },
    { label: "Condition", render: (p) => (
      <span className="compare-table__badge">
        <Check size={12} /> {gradeLabels[p.refurbishmentGrade] || p.refurbishmentGrade || "Refurbished"}
      </span>
    )},
    { label: "Processor", render: (p) => p.processor || "—" },
    { label: "RAM Memory", render: (p) => p.ramGB ? `${p.ramGB} GB ${p.ramType || ""}` : "—" },
    { label: "Storage", render: (p) => p.storageGB ? `${p.storageGB} GB ${p.storageType || "SSD"}` : "—" },
    { label: "Display Size", render: (p) => p.displaySizeInches ? `${p.displaySizeInches}" ${p.resolution || "FHD"}` : "—" },
    { label: "Operating System", render: (p) => p.operatingSystem || "Windows 11 Pro" },
    { label: "Warranty", render: (p) => (
      <span className="compare-table__warranty">
        <ShieldCheck size={13} /> {p.warrantyMonths || 12} Months
      </span>
    )},
    { label: "Battery Health", render: (p) => p.batteryHealthPct ? `${p.batteryHealthPct}%` : "Tested Good" },
  ];

  return (
    <div className="compare-modal-backdrop" onClick={() => dispatch(closeCompareModal())}>
      <div
        className="compare-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="compare-modal__header">
          <div>
            <h2>Compare Laptops</h2>
            <p>Side-by-side comparison of your selected refurbished models</p>
          </div>
          <button
            type="button"
            className="compare-modal__close"
            onClick={() => dispatch(closeCompareModal())}
            aria-label="Close comparison"
          >
            <X size={20} />
          </button>
        </div>

        <div className="compare-modal__body">
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th className="compare-table__feature-col">Specs & Features</th>
                  {compareItems.map((item) => {
                    const img = item.images?.[0];
                    const url = typeof img === "string" ? img : img?.url;
                    return (
                      <th key={item.id} className="compare-table__product-col">
                        <button
                          type="button"
                          className="compare-table__remove"
                          onClick={() => dispatch(removeCompareItem(item.id))}
                          title="Remove from comparison"
                        >
                          <X size={14} /> Remove
                        </button>
                        <div className="compare-table__img-wrap">
                          {url ? (
                            <img src={url} alt={item.title} />
                          ) : (
                            <div className="compare-table__placeholder">No image</div>
                          )}
                        </div>
                        <h4 className="compare-table__title">
                          <Link to={`/laptops/${item.id}`} onClick={() => dispatch(closeCompareModal())}>
                            {item.title}
                          </Link>
                        </h4>
                        <button
                          type="button"
                          className="button button--primary button--full compare-table__add-btn"
                          disabled={cartStatus === "loading" || item.stockQuantity < 1}
                          onClick={() => handleAddToCart(item)}
                        >
                          <ShoppingBag size={14} />
                          {item.stockQuantity < 1 ? "Out of stock" : "Add to bag"}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {specRows.map((row) => (
                  <tr key={row.label}>
                    <td className="compare-table__feature-name">{row.label}</td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="compare-table__feature-val">
                        {row.render(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
