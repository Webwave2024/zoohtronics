import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { catalogApi } from "../service/catalogService";

export const fetchProducts = createAsyncThunk(
  "catalog/fetchProducts",
  async (params, { signal, rejectWithValue }) => {
    try {
      return await catalogApi.getProducts(params, signal);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchSpotlight = createAsyncThunk(
  "catalog/fetchSpotlight",
  async (_, { signal, rejectWithValue }) => {
    try {
      const featuredResponse = await catalogApi.getProducts(
        { featured: "true", inStock: "true", pageSize: 1, page: 1 },
        signal,
      );
      if (featuredResponse.items[0]) return featuredResponse.items[0];

      const availableResponse = await catalogApi.getProducts(
        { inStock: "true", pageSize: 1, page: 1, sort: "newest" },
        signal,
      );
      return availableResponse.items[0] || null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchBestSellers = createAsyncThunk(
  "catalog/fetchBestSellers",
  async ({ all = false } = {}, { signal, rejectWithValue }) => {
    try {
      return await catalogApi.getBestSellers(signal, all);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchAllBestSellers = createAsyncThunk(
  "catalog/fetchAllBestSellers",
  async (_, { signal, rejectWithValue }) => {
    try {
      return await catalogApi.getBestSellers(signal, true);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchTrending = createAsyncThunk(
  "catalog/fetchTrending",
  async (_, { signal, rejectWithValue }) => {
    try {
      return await catalogApi.getTrending(signal);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchAllTrending = createAsyncThunk(
  "catalog/fetchAllTrending",
  async (_, { signal, rejectWithValue }) => {
    try {
      return await catalogApi.getTrending(signal, true);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchFilters = createAsyncThunk(
  "catalog/fetchFilters",
  async (_, { signal, rejectWithValue }) => {
    try {
      return await catalogApi.getFilters(signal);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchProduct = createAsyncThunk(
  "catalog/fetchProduct",
  async (id, { signal, rejectWithValue }) => {
    try {
      return await catalogApi.getProduct(id, signal);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchSuggestions = createAsyncThunk(
  "catalog/fetchSuggestions",
  async (query, { signal, rejectWithValue }) => {
    try {
      return await catalogApi.getSuggestions(query, signal);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const initialState = {
  products: [],
  spotlight: null,
  bestSellers: [],
  bestSellersFallback: false,
  allBestSellers: [],
  allBestSellersFallback: false,
  trending: [],
  trendingFallback: false,
  allTrending: [],
  allTrendingFallback: false,
  pagination: null,
  filters: null,
  query: {
    page: 1,
    pageSize: 12,
    sort: "newest",
  },
  product: null,
  suggestions: [],
  productsStatus: "idle",
  spotlightStatus: "idle",
  spotlightError: null,
  bestSellersStatus: "idle",
  bestSellersError: null,
  allBestSellersStatus: "idle",
  allBestSellersError: null,
  trendingStatus: "idle",
  trendingError: null,
  allTrendingStatus: "idle",
  allTrendingError: null,
  filtersStatus: "idle",
  productStatus: "idle",
  suggestionsStatus: "idle",
  productsError: null,
  filtersError: null,
  productError: null,
  suggestionsError: null,
};

const catalogSlice = createSlice({
  name: "catalog",
  initialState,
  reducers: {
    setCatalogQuery(state, action) {
      state.query = { ...state.query, ...action.payload, page: 1 };
      if (Object.hasOwn(action.payload, "brands")) delete state.query.brand;
      if (Object.hasOwn(action.payload, "categories")) delete state.query.category;
      if (Object.hasOwn(action.payload, "grades")) delete state.query.grade;
      if (Object.keys(action.payload).some((key) => key !== "sort")) {
        delete state.query.featured;
      }
    },
    clearCatalogQuery(state) {
      state.query = { page: 1, pageSize: 12, sort: "newest" };
    },
    setCatalogPage(state, action) {
      state.query.page = action.payload;
    },
    clearSuggestions(state) {
      state.suggestions = [];
      state.suggestionsStatus = "idle";
      state.suggestionsError = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchBestSellers.pending, (state) => {
        state.bestSellersStatus = "loading";
        state.bestSellersError = null;
      })
      .addCase(fetchBestSellers.fulfilled, (state, action) => {
        state.bestSellersStatus = "succeeded";
        state.bestSellers = action.payload.items;
        state.bestSellersFallback = action.payload.isFeaturedFallback;
      })
      .addCase(fetchBestSellers.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.bestSellersStatus = "failed";
        state.bestSellersError = action.payload || action.error.message;
      })
      .addCase(fetchAllBestSellers.pending, (state) => {
        state.allBestSellersStatus = "loading";
        state.allBestSellersError = null;
      })
      .addCase(fetchAllBestSellers.fulfilled, (state, action) => {
        state.allBestSellersStatus = "succeeded";
        state.allBestSellers = action.payload.items;
        state.allBestSellersFallback = action.payload.isFeaturedFallback;
      })
      .addCase(fetchAllBestSellers.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.allBestSellersStatus = "failed";
        state.allBestSellersError = action.payload || action.error.message;
      })
      .addCase(fetchTrending.pending, (state) => {
        state.trendingStatus = "loading";
        state.trendingError = null;
      })
      .addCase(fetchTrending.fulfilled, (state, action) => {
        state.trendingStatus = "succeeded";
        state.trending = action.payload.items;
        state.trendingFallback = action.payload.isFeaturedFallback;
      })
      .addCase(fetchTrending.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.trendingStatus = "failed";
        state.trendingError = action.payload || action.error.message;
      })
      .addCase(fetchAllTrending.pending, (state) => {
        state.allTrendingStatus = "loading";
        state.allTrendingError = null;
      })
      .addCase(fetchAllTrending.fulfilled, (state, action) => {
        state.allTrendingStatus = "succeeded";
        state.allTrending = action.payload.items;
        state.allTrendingFallback = action.payload.isFeaturedFallback;
      })
      .addCase(fetchAllTrending.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.allTrendingStatus = "failed";
        state.allTrendingError = action.payload || action.error.message;
      })
      .addCase(fetchProducts.pending, (state) => {
        state.productsStatus = "loading";
        state.productsError = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.productsStatus = "succeeded";
        state.products = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.productsStatus = "failed";
        state.productsError = action.payload || action.error.message;
      })
      .addCase(fetchSpotlight.pending, (state) => {
        state.spotlightStatus = "loading";
        state.spotlightError = null;
      })
      .addCase(fetchSpotlight.fulfilled, (state, action) => {
        state.spotlightStatus = "succeeded";
        state.spotlight = action.payload;
      })
      .addCase(fetchSpotlight.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.spotlightStatus = "failed";
        state.spotlightError = action.payload || action.error.message;
      })
      .addCase(fetchFilters.pending, (state) => {
        state.filtersStatus = "loading";
      })
      .addCase(fetchFilters.fulfilled, (state, action) => {
        state.filtersStatus = "succeeded";
        state.filters = action.payload.filters;
      })
      .addCase(fetchFilters.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.filtersStatus = "failed";
        state.filtersError = action.payload || action.error.message;
      })
      .addCase(fetchProduct.pending, (state) => {
        state.productStatus = "loading";
        state.product = null;
        state.productError = null;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.productStatus = "succeeded";
        state.product = action.payload.product;
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.productStatus = "failed";
        state.productError = action.payload || action.error.message;
      })
      .addCase(fetchSuggestions.pending, (state) => {
        state.suggestionsStatus = "loading";
        state.suggestionsError = null;
      })
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        state.suggestionsStatus = "succeeded";
        state.suggestions = action.payload.suggestions;
      })
      .addCase(fetchSuggestions.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.suggestionsStatus = "failed";
        state.suggestionsError = action.payload || action.error.message;
      });
  },
});

export const {
  setCatalogQuery,
  clearCatalogQuery,
  setCatalogPage,
  clearSuggestions,
} = catalogSlice.actions;

export default catalogSlice.reducer;
