import { apiRequest } from "../../../shared/api/client";

export const cartService = {
  getCart() {
    return apiRequest("/cart");
  },

  addItem({ laptopId, quantity = 1 }) {
    return apiRequest("/cart/items", {
      method: "POST",
      body: { laptopId, quantity },
    });
  },

  updateItem({ itemId, quantity }) {
    return apiRequest(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: { quantity },
    });
  },

  removeItem(itemId) {
    return apiRequest(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
    });
  },

  clearCart() {
    return apiRequest("/cart", {
      method: "DELETE",
    });
  },

  getWishlist() {
    return apiRequest("/wishlist");
  },

  addWishlistItem(laptopId) {
    return apiRequest("/wishlist/items", {
      method: "POST",
      body: { laptopId },
    });
  },

  removeWishlistItem(laptopId) {
    return apiRequest(`/wishlist/items/${encodeURIComponent(laptopId)}`, {
      method: "DELETE",
    });
  },
};

export default cartService;
