import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import cartService from "../service/cartService";

const GUEST_CART_KEY = "zohntronics_guest_cart";

function loadGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveGuestCart(cart) {
  try {
    if (!cart || !cart.items || cart.items.length === 0) {
      localStorage.removeItem(GUEST_CART_KEY);
    } else {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    }
  } catch {
    // Ignore localStorage write errors
  }
}

function calculateCartTotals(items = []) {
  const currency = items[0]?.laptop?.currency || "INR";
  const hasMixedCurrencies = items.some((i) => i.laptop?.currency && i.laptop?.currency !== currency);
  let subtotal = 0;
  if (!hasMixedCurrencies) {
    subtotal = items.reduce((sum, item) => {
      const price = Number(item.laptop?.price) || 0;
      return sum + price * (item.quantity || 1);
    }, 0);
  }
  return {
    subtotal: subtotal.toFixed(2),
    currency: hasMixedCurrencies ? null : currency,
    hasMixedCurrencies,
  };
}

function reject(error, rejectWithValue) {
  return rejectWithValue(error.message || "The request could not be completed.");
}

export const fetchCart = createAsyncThunk("cart/fetchCart", async (_, { getState, rejectWithValue }) => {
  const { auth } = getState();
  if (auth?.status === "authenticated") {
    try {
      const guestCart = loadGuestCart();
      if (guestCart?.items?.length) {
        for (const item of guestCart.items) {
          try {
            await cartService.addItem({ laptopId: item.laptopId, quantity: item.quantity });
          } catch {
            // continue syncing next
          }
        }
        saveGuestCart(null);
      }
      return (await cartService.getCart()).cart;
    } catch (error) {
      return reject(error, rejectWithValue);
    }
  }

  const localCart = loadGuestCart();
  if (localCart) return localCart;
  return { id: "guest", items: [], subtotal: "0.00", currency: "INR", hasMixedCurrencies: false };
});

export const addCartItem = createAsyncThunk(
  "cart/addItem",
  async ({ laptopId, quantity = 1, product }, { getState, rejectWithValue }) => {
    const { auth } = getState();
    if (auth?.status === "authenticated") {
      try {
        await cartService.addItem({ laptopId, quantity });
        return (await cartService.getCart()).cart;
      } catch (error) {
        return reject(error, rejectWithValue);
      }
    }

    try {
      let guestCart = loadGuestCart() || {
        id: "guest",
        items: [],
      };

      const existingIndex = guestCart.items.findIndex(
        (item) => item.laptopId === laptopId || item.laptop?.id === laptopId
      );

      if (existingIndex >= 0) {
        guestCart.items[existingIndex].quantity += quantity;
      } else {
        guestCart.items.push({
          id: `guest_${laptopId}_${Date.now()}`,
          cartId: "guest",
          laptopId,
          quantity,
          laptop: product || { id: laptopId, title: "Refurbished Laptop", price: 0 },
        });
      }

      const totals = calculateCartTotals(guestCart.items);
      guestCart = {
        ...guestCart,
        ...totals,
      };

      saveGuestCart(guestCart);
      return guestCart;
    } catch (err) {
      return rejectWithValue(err.message || "Could not add item to bag");
    }
  }
);

export const updateCartItem = createAsyncThunk(
  "cart/updateItem",
  async ({ itemId, quantity }, { getState, rejectWithValue }) => {
    const { auth } = getState();
    if (auth?.status === "authenticated") {
      try {
        await cartService.updateItem({ itemId, quantity });
        return (await cartService.getCart()).cart;
      } catch (error) {
        return reject(error, rejectWithValue);
      }
    }

    try {
      const guestCart = loadGuestCart() || { id: "guest", items: [] };
      const item = guestCart.items.find((i) => i.id === itemId);
      if (item) {
        item.quantity = quantity;
      }
      const totals = calculateCartTotals(guestCart.items);
      const updated = { ...guestCart, ...totals };
      saveGuestCart(updated);
      return updated;
    } catch (err) {
      return rejectWithValue(err.message || "Could not update item");
    }
  }
);

export const removeCartItem = createAsyncThunk(
  "cart/removeItem",
  async (itemId, { getState, rejectWithValue }) => {
    const { auth } = getState();
    if (auth?.status === "authenticated") {
      try {
        await cartService.removeItem(itemId);
        return (await cartService.getCart()).cart;
      } catch (error) {
        return reject(error, rejectWithValue);
      }
    }

    try {
      const guestCart = loadGuestCart() || { id: "guest", items: [] };
      guestCart.items = guestCart.items.filter((i) => i.id !== itemId);
      const totals = calculateCartTotals(guestCart.items);
      const updated = { ...guestCart, ...totals };
      saveGuestCart(updated);
      return updated;
    } catch (err) {
      return rejectWithValue(err.message || "Could not remove item");
    }
  }
);

export const clearRemoteCart = createAsyncThunk(
  "cart/clear",
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState();
    if (auth?.status === "authenticated") {
      try {
        await cartService.clearCart();
        return (await cartService.getCart()).cart;
      } catch (error) {
        return reject(error, rejectWithValue);
      }
    }

    saveGuestCart(null);
    return { id: "guest", items: [], subtotal: "0.00", currency: "INR", hasMixedCurrencies: false };
  }
);

export const fetchWishlist = createAsyncThunk("cart/fetchWishlist", async (_, { rejectWithValue }) => {
  try {
    return (await cartService.getWishlist()).wishlist;
  } catch (error) {
    return reject(error, rejectWithValue);
  }
});

export const addWishlistItem = createAsyncThunk("cart/addWishlistItem", async (laptopId, { rejectWithValue }) => {
  try {
    await cartService.addWishlistItem(laptopId);
    return (await cartService.getWishlist()).wishlist;
  } catch (error) {
    return reject(error, rejectWithValue);
  }
});

export const removeWishlistItem = createAsyncThunk("cart/removeWishlistItem", async (laptopId, { rejectWithValue }) => {
  try {
    await cartService.removeWishlistItem(laptopId);
    return (await cartService.getWishlist()).wishlist;
  } catch (error) {
    return reject(error, rejectWithValue);
  }
});

const initialState = {
  cart: loadGuestCart(),
  wishlist: [],
  cartStatus: "idle",
  wishlistStatus: "idle",
  cartError: null,
  wishlistError: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    resetCustomerCommerce(state) {
      state.cart = loadGuestCart();
      state.wishlist = [];
      state.cartStatus = "idle";
      state.wishlistStatus = "idle";
      state.cartError = null;
      state.wishlistError = null;
    },
    clearCartError(state) {
      state.cartError = null;
    },
    clearWishlistError(state) {
      state.wishlistError = null;
    },
  },
  extraReducers(builder) {
    const cartActions = [fetchCart, addCartItem, updateCartItem, removeCartItem, clearRemoteCart];
    cartActions.forEach((action) => {
      builder
        .addCase(action.pending, (state) => {
          state.cartStatus = "loading";
          state.cartError = null;
        })
        .addCase(action.fulfilled, (state, event) => {
          state.cart = event.payload;
          state.cartStatus = "succeeded";
        })
        .addCase(action.rejected, (state, event) => {
          state.cartStatus = "failed";
          state.cartError = event.payload || event.error.message;
        });
    });

    const wishlistActions = [fetchWishlist, addWishlistItem, removeWishlistItem];
    wishlistActions.forEach((action) => {
      builder
        .addCase(action.pending, (state) => {
          state.wishlistStatus = "loading";
          state.wishlistError = null;
        })
        .addCase(action.fulfilled, (state, event) => {
          state.wishlist = event.payload.items.map((item) => item.laptop);
          state.wishlistStatus = "succeeded";
        })
        .addCase(action.rejected, (state, event) => {
          state.wishlistStatus = "failed";
          state.wishlistError = event.payload || event.error.message;
        });
    });
  },
});

export const { resetCustomerCommerce, clearCartError, clearWishlistError } = cartSlice.actions;
export default cartSlice.reducer;
