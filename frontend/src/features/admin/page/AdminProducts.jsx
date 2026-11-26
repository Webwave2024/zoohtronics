import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Boxes, ChevronLeft, ChevronRight, Edit3, ImagePlus, Plus, Search, X } from "lucide-react";
import { adminRequest, errorMessage, formatAdminPrice, queryString, uploadProductImage } from "../service/adminService";

const initialProduct = {
  sku: "", title: "", description: "", brand: "", model: "", releaseYear: "",
  processor: "", processorGeneration: "", ramGB: "8", ramType: "", storageGB: "256",
  storageType: "SSD", graphics: "", displaySizeInches: "", resolution: "",
  displayType: "", touchscreen: false, operatingSystem: "", color: "",
  batteryHealthPct: "", refurbishmentGrade: "EXCELLENT", conditionNotes: "",
  warrantyMonths: "3", price: "", compareAtPrice: "", currency: "INR",
  stockQuantity: "1", status: "ACTIVE", featured: false, categoryIds: [], images: [],
};

const statuses = ["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"];
const grades = ["LIKE_NEW", "EXCELLENT", "GOOD", "FAIR"];
const numericFields = ["ramGB", "storageGB", "warrantyMonths", "price", "stockQuantity"];
const optionalNumericFields = ["releaseYear", "displaySizeInches", "batteryHealthPct"];
const optionalPriceFields = ["compareAtPrice"];
const optionalTextFields = ["processorGeneration", "graphics", "resolution", "displayType", "operatingSystem", "color", "conditionNotes"];

function makePayload(form, creating) {
  const payload = { ...form };
  numericFields.forEach((field) => {
    if (field === "stockQuantity" && !creating) {
      delete payload[field];
      return;
    }
    payload[field] = Number(form[field]);
  });
  optionalNumericFields.forEach((field) => {
    const val = form[field];
    if (val === "" || val === null || val === undefined) {
      payload[field] = null;
    } else {
      const num = Number(val);
      payload[field] = Number.isNaN(num) ? null : num;
    }
  });
  optionalPriceFields.forEach((field) => {
    const num = Number(form[field]);
    payload[field] = form[field] === "" || Number.isNaN(num) || num <= 0 ? null : num;
  });
  optionalTextFields.forEach((field) => { payload[field] = form[field].trim() || null; });
  payload.ramType = form.ramType || null;
  payload.categoryIds = form.categoryIds;
  payload.images = form.images.map(({ url, altText }) => ({ url, altText }));
  payload.currency = form.currency.toUpperCase();
  return payload;
}

function productToForm(product) {
  const result = { ...initialProduct, ...product };
  ["releaseYear", "displaySizeInches", "batteryHealthPct", "compareAtPrice"].forEach((field) => {
    result[field] = product[field] ?? "";
  });
  ["processorGeneration", "graphics", "resolution", "displayType", "operatingSystem", "color", "conditionNotes"].forEach((field) => {
    result[field] = product[field] ?? "";
  });
  result.ramType = product.ramType ?? "";
  result.categoryIds = product.categories?.map((category) => category.id) || [];
  result.images = product.images?.map((image) => ({ url: image.url, altText: image.altText || "" })) || [];
  return result;
}

export default function AdminProducts() {
  const [filters, setFilters] = useState({ search: "", status: "", stock: "", sort: "newest", page: 1 });
  const [queryText, setQueryText] = useState("");
  const [result, setResult] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [loadedQuery, setLoadedQuery] = useState(null);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [inventoryProduct, setInventoryProduct] = useState(null);
  const [inventoryForm, setInventoryForm] = useState({ type: "RESTOCK", quantityChange: "1", reason: "" });
  const [movements, setMovements] = useState([]);
  const [movementError, setMovementError] = useState("");
  const [inventorySaving, setInventorySaving] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", description: "" });

  const currentQuery = queryString({ ...filters, pageSize: 20 });
  const loadProducts = useCallback(async () => {
    try {
      const data = await adminRequest(`/admin/products?${currentQuery}`);
      setResult(data);
      setError("");
      setStatus("succeeded");
    } catch (requestError) {
      setError(errorMessage(requestError));
      setStatus("failed");
    } finally {
      setLoadedQuery(currentQuery);
    }
  }, [currentQuery]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => {
    adminRequest("/categories").then(({ categories: list }) => setCategories(list)).catch((requestError) => setMutationError(errorMessage(requestError)));
  }, []);

  async function openEditor(product = null) {
    setMutationError("");
    setSuccessMessage("");
    if (!product) {
      setEditor({ id: null, form: { ...initialProduct } });
      return;
    }
    try {
      const { product: fullProduct } = await adminRequest(`/admin/products/${encodeURIComponent(product.id)}`);
      setEditor({ id: fullProduct.id, form: productToForm(fullProduct) });
    } catch (requestError) {
      setMutationError(errorMessage(requestError));
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    setMutationError("");
    setSuccessMessage("");

    if (!editor.id && editor.form.status === "ACTIVE" && Number(editor.form.stockQuantity) <= 0) {
      setMutationError("An active product must have at least 1 in stock so it appears on the storefront. Enter an initial stock quantity or change status to DRAFT.");
      return;
    }

    setSaving(true);
    try {
      const path = editor.id ? `/admin/products/${encodeURIComponent(editor.id)}` : "/admin/products";
      const method = editor.id ? "PATCH" : "POST";
      await adminRequest(path, { method, body: makePayload(editor.form, !editor.id) });
      setEditor(null);
      setSuccessMessage(editor.id ? "Product updated successfully!" : "Product created and published to storefront successfully!");
      await loadProducts();
    } catch (requestError) {
      setMutationError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function archiveProduct(product) {
    if (!window.confirm(`Archive "${product.title}"? This removes it from the storefront but preserves its order history.`)) return;
    setMutationError("");
    try {
      await adminRequest(`/admin/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
      await loadProducts();
    } catch (requestError) {
      setMutationError(errorMessage(requestError));
    }
  }

  async function addImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (files.length + editor.form.images.length > 20) {
      setMutationError("A product can have at most 20 images.");
      return;
    }
    setUploading(true);
    setMutationError("");
    try {
      const imageUrls = await Promise.all(files.map(uploadProductImage));
      setEditor((current) => current && ({
        ...current,
        form: { ...current.form, images: [...current.form.images, ...imageUrls.map((url) => ({ url, altText: current.form.title }))] },
      }));
    } catch (uploadError) {
      setMutationError(errorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  }

  async function openInventory(product) {
    setInventoryProduct(product);
    setInventoryForm({ type: "RESTOCK", quantityChange: "1", reason: "" });
    setMovements([]);
    setMovementError("");
    try {
      const data = await adminRequest(`/admin/products/${encodeURIComponent(product.id)}/inventory?page=1&pageSize=10`);
      setMovements(data.items);
    } catch (requestError) {
      setMovementError(errorMessage(requestError));
    }
  }

  async function adjustInventory(event) {
    event.preventDefault();
    setInventorySaving(true);
    setMovementError("");
    try {
      await adminRequest(`/admin/products/${encodeURIComponent(inventoryProduct.id)}/inventory-adjustments`, {
        method: "POST",
        body: { ...inventoryForm, quantityChange: Number(inventoryForm.quantityChange) },
      });
      await loadProducts();
      await openInventory(inventoryProduct);
      setInventoryForm((current) => ({ ...current, reason: "" }));
    } catch (requestError) {
      setMovementError(errorMessage(requestError));
    } finally {
      setInventorySaving(false);
    }
  }

  async function addCategory() {
    setMutationError("");
    try {
      const { category } = await adminRequest("/categories", { method: "POST", body: newCategory });
      setCategories((current) => [...current, category]);
      setEditor((current) => current && ({ ...current, form: { ...current.form, categoryIds: [...current.form.categoryIds, category.id] } }));
      setNewCategory({ name: "", slug: "", description: "" });
    } catch (requestError) {
      setMutationError(errorMessage(requestError));
    }
  }

  const updateForm = (field, value) => setEditor((current) => ({ ...current, form: { ...current.form, [field]: value } }));
  const products = result.items || [];
  const isLoading = status === "loading" || loadedQuery !== currentQuery;

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">CATALOG & INVENTORY</p><h1>Products</h1><p>Manage laptop details, visibility, and audited stock levels.</p></div><button className="admin-button admin-button--primary" type="button" onClick={() => openEditor()}><Plus size={16} /> Add product</button></div>
      {successMessage && <div className="admin-alert admin-alert--success" role="alert" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderColor: "#10b981", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "6px", marginBottom: "1rem" }}>{successMessage}<button type="button" aria-label="Dismiss" onClick={() => setSuccessMessage("")}><X size={15} /></button></div>}
      {mutationError && <div className="admin-alert admin-alert--error" role="alert">{mutationError}<button type="button" aria-label="Dismiss" onClick={() => setMutationError("")}><X size={15} /></button></div>}
      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, search: queryText, page: 1 })); }}><Search size={16} /><input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search title, SKU, brand…" /><button type="submit">Search</button></form>
        <select aria-label="Product status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Stock filter" value={filters.stock} onChange={(event) => setFilters((current) => ({ ...current, stock: event.target.value, page: 1 }))}><option value="">All stock</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option></select>
        <select aria-label="Product sort" value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value, page: 1 }))}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="stock_asc">Stock: low to high</option><option value="stock_desc">Stock: high to low</option></select>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Catalog</h2><p>{result.pagination.total || 0} products in the current selection</p></div></div>
        {isLoading ? <div className="admin-loading">Loading products…</div> : status === "failed" ? <div className="admin-alert admin-alert--error">{error}<button type="button" onClick={loadProducts}>Retry</button></div> : products.length ? (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Status</th><th>Price</th><th>Stock</th><th>Categories</th><th>Actions</th></tr></thead><tbody>{products.map((product) => (
            <tr key={product.id}>
              <td><div className="admin-product-cell">{product.images?.[0]?.url ? <img src={product.images[0].url} alt="" /> : <span className="admin-product-placeholder">Z</span>}<div><strong>{product.title}</strong><small>{product.brand} · SKU {product.sku}</small></div></div></td>
              <td><span className={`admin-badge admin-badge--${product.status.toLowerCase()}`}>{product.status.replaceAll("_", " ")}</span></td>
              <td className="admin-table__amount">{formatAdminPrice(product.price, product.currency)}</td>
              <td><button className={`admin-stock-button${product.inventory.availability === "LOW_STOCK" || product.inventory.availability === "OUT_OF_STOCK" ? " is-low" : ""}`} type="button" onClick={() => openInventory(product)}><Boxes size={14} /> {product.stockQuantity}<small>{product.inventory.availability.replaceAll("_", " ")}</small></button></td>
              <td>{product.categories.map((category) => category.name).join(", ") || "—"}</td>
              <td><div className="admin-row-actions"><button type="button" title="Edit product" onClick={() => openEditor(product)}><Edit3 size={15} /></button>{product.status !== "ARCHIVED" && <button className="is-danger" type="button" title="Archive product" onClick={() => archiveProduct(product)}><X size={15} /></button>}</div></td>
            </tr>
          ))}</tbody></table></div>
        ) : <div className="admin-empty">No products match these filters.</div>}
        {result.pagination.pages > 1 && <div className="admin-pagination"><span>Page {result.pagination.page} of {result.pagination.pages}</span><div><button type="button" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}><ChevronLeft size={16} /> Previous</button><button type="button" disabled={filters.page >= result.pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next <ChevronRight size={16} /></button></div></div>}
      </section>

      {editor && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !uploading) setEditor(null); }}><section className="admin-modal admin-modal--wide" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
        <div className="admin-modal-heading"><div><p className="admin-eyebrow">{editor.id ? "EDIT CATALOG ITEM" : "NEW CATALOG ITEM"}</p><h2 id="product-editor-title">{editor.id ? "Update product" : "Add a product"}</h2></div><button type="button" aria-label="Close" onClick={() => setEditor(null)}><X size={19} /></button></div>
        <form className="admin-form" onSubmit={saveProduct}>
          <fieldset><legend>Product information</legend><div className="admin-form-grid">
            <label>SKU<input required maxLength={100} value={editor.form.sku} onChange={(event) => updateForm("sku", event.target.value)} /></label>
            <label>Title<input required maxLength={200} value={editor.form.title} onChange={(event) => updateForm("title", event.target.value)} /></label>
            <label>Brand<input required maxLength={100} value={editor.form.brand} onChange={(event) => updateForm("brand", event.target.value)} /></label>
            <label>Model<input required maxLength={150} value={editor.form.model} onChange={(event) => updateForm("model", event.target.value)} /></label>
            <label>Release year<input type="number" min="1970" max="2100" value={editor.form.releaseYear} onChange={(event) => updateForm("releaseYear", event.target.value)} /></label>
            <label>Condition grade<select required value={editor.form.refurbishmentGrade} onChange={(event) => updateForm("refurbishmentGrade", event.target.value)}>{grades.map((grade) => <option key={grade}>{grade}</option>)}</select></label>
            <label className="admin-form-full">Description<textarea required rows="3" value={editor.form.description} onChange={(event) => updateForm("description", event.target.value)} /></label>
            <label className="admin-form-full">Condition notes<textarea rows="2" maxLength={5000} value={editor.form.conditionNotes} onChange={(event) => updateForm("conditionNotes", event.target.value)} /></label>
          </div></fieldset>
          <fieldset><legend>Specifications</legend><div className="admin-form-grid">
            <label>Processor<input required maxLength={150} value={editor.form.processor} onChange={(event) => updateForm("processor", event.target.value)} /></label>
            <label>Processor generation<input value={editor.form.processorGeneration} onChange={(event) => updateForm("processorGeneration", event.target.value)} /></label>
            <label>RAM (GB)<input required type="number" min="1" value={editor.form.ramGB} onChange={(event) => updateForm("ramGB", event.target.value)} /></label>
            <label>RAM type<select value={editor.form.ramType} onChange={(event) => updateForm("ramType", event.target.value)}><option value="">Not specified</option>{["DDR3", "DDR4", "DDR5", "LPDDR4", "LPDDR5"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Storage (GB)<input required type="number" min="1" value={editor.form.storageGB} onChange={(event) => updateForm("storageGB", event.target.value)} /></label>
            <label>Storage type<select required value={editor.form.storageType} onChange={(event) => updateForm("storageType", event.target.value)}>{["SSD", "HDD", "NVME", "HYBRID"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Graphics<input value={editor.form.graphics} onChange={(event) => updateForm("graphics", event.target.value)} /></label>
            <label>Display size (inches)<input type="number" min="0.1" step="0.1" value={editor.form.displaySizeInches} onChange={(event) => updateForm("displaySizeInches", event.target.value)} /></label>
            <label>Resolution<input value={editor.form.resolution} onChange={(event) => updateForm("resolution", event.target.value)} /></label>
            <label>Display type<input value={editor.form.displayType} onChange={(event) => updateForm("displayType", event.target.value)} /></label>
            <label>Operating system<input value={editor.form.operatingSystem} onChange={(event) => updateForm("operatingSystem", event.target.value)} /></label>
            <label>Color<input value={editor.form.color} onChange={(event) => updateForm("color", event.target.value)} /></label>
            <label>Battery health (%)<input type="number" min="0" max="100" value={editor.form.batteryHealthPct} onChange={(event) => updateForm("batteryHealthPct", event.target.value)} /></label>
            <label className="admin-checkbox"><input type="checkbox" checked={editor.form.touchscreen} onChange={(event) => updateForm("touchscreen", event.target.checked)} /> Touchscreen</label>
          </div></fieldset>
          <fieldset><legend>Pricing & availability</legend><div className="admin-form-grid">
            <label>Price<input required type="number" min="0.01" step="0.01" value={editor.form.price} onChange={(event) => updateForm("price", event.target.value)} /></label>
            <label>Compare-at price<input type="number" min="0.01" step="0.01" value={editor.form.compareAtPrice} onChange={(event) => updateForm("compareAtPrice", event.target.value)} /></label>
            <label>Currency<input required minLength="3" maxLength="3" value={editor.form.currency} onChange={(event) => updateForm("currency", event.target.value.toUpperCase())} /></label>
            <label>Warranty (months)<input type="number" min="0" max="120" value={editor.form.warrantyMonths} onChange={(event) => updateForm("warrantyMonths", event.target.value)} /></label>
            {!editor.id && (
              <label>
                Initial stock
                <input
                  required
                  type="number"
                  min={editor.form.status === "ACTIVE" ? 1 : 0}
                  value={editor.form.stockQuantity}
                  onChange={(event) => updateForm("stockQuantity", event.target.value)}
                />
              </label>
            )}
            <label>
              Status
              <select
                value={editor.form.status}
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  updateForm("status", nextStatus);
                  if (!editor.id && nextStatus === "ACTIVE" && Number(editor.form.stockQuantity) <= 0) {
                    updateForm("stockQuantity", "1");
                  }
                }}
              >
                {statuses.filter((item) => item !== "ARCHIVED" || editor.id).map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="admin-checkbox"><input type="checkbox" checked={editor.form.featured} onChange={(event) => updateForm("featured", event.target.checked)} /> Feature on storefront</label>
          </div></fieldset>
          <fieldset><legend>Categories</legend><div className="admin-category-options">{categories.map((category) => <label key={category.id}><input type="checkbox" checked={editor.form.categoryIds.includes(category.id)} onChange={(event) => updateForm("categoryIds", event.target.checked ? [...editor.form.categoryIds, category.id] : editor.form.categoryIds.filter((id) => id !== category.id))} /> {category.name}</label>)}{!categories.length && <span>No categories. Create one below.</span>}</div>
            <div className="admin-inline-category"><input placeholder="New category name" value={newCategory.name} onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value, slug: event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }))} /><input placeholder="category-slug" value={newCategory.slug} onChange={(event) => setNewCategory((current) => ({ ...current, slug: event.target.value }))} /><button className="admin-button" type="button" disabled={!newCategory.name.trim() || !newCategory.slug.trim()} onClick={addCategory}>Add category</button></div>
          </fieldset>
          <fieldset><legend>Product images</legend><label className="admin-upload-button"><ImagePlus size={16} /> {uploading ? "Uploading images…" : "Upload images"}<input type="file" accept="image/avif,image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={addImages} /></label><div className="admin-image-list">{editor.form.images.map((image, index) => <div key={`${image.url}-${index}`}><img src={image.url} alt={image.altText} /><span>Image {index + 1}</span><button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => updateForm("images", editor.form.images.filter((_, imageIndex) => imageIndex !== index))}><X size={14} /></button></div>)}</div><small className="admin-form-help">JPG, PNG, WebP, or AVIF, maximum 10 MB per image. Uploads use the configured S3 storage.</small></fieldset>
          {mutationError && <div className="admin-alert admin-alert--error">{mutationError}</div>}
          <div className="admin-modal-actions"><button className="admin-button" type="button" disabled={saving || uploading} onClick={() => setEditor(null)}>Cancel</button><button className="admin-button admin-button--primary" type="submit" disabled={saving || uploading}>{saving ? "Saving…" : editor.id ? "Save changes" : "Create product"}</button></div>
        </form>
      </section></div>}

      {inventoryProduct && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !inventorySaving) setInventoryProduct(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-title">
        <div className="admin-modal-heading"><div><p className="admin-eyebrow">AUDITED INVENTORY</p><h2 id="inventory-title">{inventoryProduct.title}</h2><p>Current stock: <strong>{inventoryProduct.stockQuantity}</strong></p></div><button type="button" aria-label="Close" onClick={() => setInventoryProduct(null)}><X size={19} /></button></div>
        <form className="admin-form" onSubmit={adjustInventory}>
          <div className="admin-form-grid"><label>Movement type<select value={inventoryForm.type} onChange={(event) => setInventoryForm((current) => ({ ...current, type: event.target.value, quantityChange: event.target.value === "RESTOCK" || event.target.value === "RETURN" ? String(Math.abs(Number(current.quantityChange)) || 1) : current.quantityChange }))}><option value="RESTOCK">Restock</option><option value="RETURN">Customer return</option><option value="ADJUSTMENT">Adjustment</option></select></label><label>Quantity change<input required type="number" min={inventoryForm.type === "ADJUSTMENT" ? -2147483647 : 1} max="2147483647" step="1" value={inventoryForm.quantityChange} onChange={(event) => setInventoryForm((current) => ({ ...current, quantityChange: event.target.value }))} /></label><label className="admin-form-full">Reason<input required minLength={3} maxLength={500} value={inventoryForm.reason} onChange={(event) => setInventoryForm((current) => ({ ...current, reason: event.target.value }))} placeholder="e.g. Received supplier shipment" /></label></div>
          {movementError && <div className="admin-alert admin-alert--error">{movementError}</div>}<button className="admin-button admin-button--primary" type="submit" disabled={inventorySaving}>{inventorySaving ? "Recording…" : "Record adjustment"}</button>
        </form>
        <div className="admin-movement-list"><h3>Recent stock movements</h3>{movements.length ? movements.map((movement) => <div key={movement.id}><span className={movement.quantityChange > 0 ? "is-positive" : "is-negative"}>{movement.quantityChange > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}</span><div><strong>{movement.type.replaceAll("_", " ")}</strong><small>{movement.reason}</small></div><time>{new Date(movement.createdAt).toLocaleDateString()}</time></div>) : <p>No inventory movements recorded.</p>}</div>
      </section></div>}
    </section>
  );
}
