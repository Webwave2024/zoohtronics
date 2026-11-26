import { useEffect, useState } from "react";
import { Edit3, Plus, Tags, Trash2, X } from "lucide-react";
import { adminRequest, errorMessage } from "../service/adminService";

const blankCategory = { name: "", slug: "", description: "" };

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadCategories() {
    setError("");
    try {
      const { categories: rows } = await adminRequest("/categories");
      setCategories(rows);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCategories(); }, []);

  function openEditor(category = null) {
    setEditor({
      id: category?.id || null,
      form: category
        ? { name: category.name, slug: category.slug, description: category.description || "" }
        : { ...blankCategory },
    });
  }

  async function saveCategory(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { id, form } = editor;
      await adminRequest(id ? `/categories/${encodeURIComponent(id)}` : "/categories", {
        method: id ? "PATCH" : "POST",
        body: { ...form, description: form.description || undefined },
      });
      setEditor(null);
      await loadCategories();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Delete category "${category.name}"? Products assigned to it may prevent deletion.`)) return;
    setError("");
    try {
      await adminRequest(`/categories/${encodeURIComponent(category.id)}`, { method: "DELETE" });
      await loadCategories();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">CATALOG ORGANIZATION</p><h1>Categories</h1><p>Group laptops so customers can find the right fit.</p></div><button className="admin-button admin-button--primary" type="button" onClick={() => openEditor()}><Plus size={16} /> Add category</button></div>
      {error && <div className="admin-alert admin-alert--error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div>}
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Product categories</h2><p>{categories.length} category(ies)</p></div></div>
        {loading ? <div className="admin-loading">Loading categories…</div> : categories.length ? <div className="admin-category-list">{categories.map((category) => <article key={category.id}><span className="admin-category-icon"><Tags size={17} /></span><div><strong>{category.name}</strong><small>/{category.slug}</small>{category.description && <p>{category.description}</p>}</div><div className="admin-row-actions"><button type="button" aria-label={`Edit ${category.name}`} onClick={() => openEditor(category)}><Edit3 size={15} /></button><button className="is-danger" type="button" aria-label={`Delete ${category.name}`} onClick={() => deleteCategory(category)}><Trash2 size={15} /></button></div></article>)}</div> : <div className="admin-empty">No categories yet. Add a category to organize your catalog.</div>}
      </section>
      {editor && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditor(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="category-title"><div className="admin-modal-heading"><div><p className="admin-eyebrow">CATALOG ORGANIZATION</p><h2 id="category-title">{editor.id ? "Edit category" : "New category"}</h2></div><button type="button" aria-label="Close" onClick={() => setEditor(null)}><X size={19} /></button></div>
        <form className="admin-form" onSubmit={saveCategory}><div className="admin-form-grid"><label>Category name<input required maxLength={100} value={editor.form.name} onChange={(event) => setEditor((current) => ({ ...current, form: { ...current.form, name: event.target.value, ...(!current.id && current.form.slug === slugify(current.form.name) ? { slug: slugify(event.target.value) } : {}) } }))} /></label><label>URL slug<input required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={editor.form.slug} onChange={(event) => setEditor((current) => ({ ...current, form: { ...current.form, slug: event.target.value } }))} /></label><label className="admin-form-full">Description <small>(optional)</small><textarea rows="3" maxLength={2000} value={editor.form.description} onChange={(event) => setEditor((current) => ({ ...current, form: { ...current.form, description: event.target.value } }))} /></label></div><div className="admin-modal-actions"><button className="admin-button" type="button" disabled={saving} onClick={() => setEditor(null)}>Cancel</button><button className="admin-button admin-button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : editor.id ? "Save category" : "Create category"}</button></div></form>
      </section></div>}
    </section>
  );
}
