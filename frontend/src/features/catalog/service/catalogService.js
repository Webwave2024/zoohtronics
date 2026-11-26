const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

async function request(path, { signal } = {}) {
  const response = await fetch(`${API_URL}${path}`, { signal });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(data?.error || "The request could not be completed.");
  }

  return data;
}

export const catalogService = {
  getProducts(params, signal) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return request(`/laptops?${query}`, { signal });
  },
  getBestSellers(signal, all = false) {
    return request(`/laptops/best-sellers${all ? "?all=true" : ""}`, { signal });
  },
  getTrending(signal, all = false) {
    return request(`/laptops/trending${all ? "?all=true" : ""}`, { signal });
  },
  getFilters(signal) {
    return request("/laptops/filters", { signal });
  },
  getProduct(id, signal) {
    return request(`/laptops/${encodeURIComponent(id)}`, { signal });
  },
  getSuggestions(query, signal) {
    return request(`/search/suggestions?q=${encodeURIComponent(query)}`, { signal });
  },
};

export const catalogApi = catalogService;
export default catalogService;
