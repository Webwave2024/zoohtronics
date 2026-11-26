import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  clearCatalogQuery,
  clearSuggestions,
  fetchAllBestSellers,
  fetchAllTrending,
  fetchBestSellers,
  fetchFilters,
  fetchProduct,
  fetchProducts,
  fetchSpotlight,
  fetchSuggestions,
  fetchTrending,
  setCatalogPage,
  setCatalogQuery,
} from "../state/catalogSlice";

export function useCatalog() {
  const dispatch = useAppDispatch();
  const catalog = useAppSelector((state) => state.catalog);

  return {
    ...catalog,
    fetchProducts: (params, options) => dispatch(fetchProducts(params, options)),
    fetchSpotlight: (options) => dispatch(fetchSpotlight(undefined, options)),
    fetchBestSellers: (params, options) => dispatch(fetchBestSellers(params, options)),
    fetchAllBestSellers: (options) => dispatch(fetchAllBestSellers(undefined, options)),
    fetchTrending: (options) => dispatch(fetchTrending(undefined, options)),
    fetchAllTrending: (options) => dispatch(fetchAllTrending(undefined, options)),
    fetchFilters: (options) => dispatch(fetchFilters(undefined, options)),
    fetchProduct: (id, options) => dispatch(fetchProduct(id, options)),
    fetchSuggestions: (query, options) => dispatch(fetchSuggestions(query, options)),
    setQuery: (patch) => dispatch(setCatalogQuery(patch)),
    clearQuery: () => dispatch(clearCatalogQuery()),
    setPage: (page) => dispatch(setCatalogPage(page)),
    clearSuggestions: () => dispatch(clearSuggestions()),
  };
}

export default useCatalog;
