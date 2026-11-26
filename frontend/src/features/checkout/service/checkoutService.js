import { apiRequest } from "../../../shared/api/client";

export const checkoutService = {
  getAddresses() {
    return apiRequest("/account/addresses");
  },

  createAddress(body) {
    return apiRequest("/account/addresses", {
      method: "POST",
      body,
    });
  },

  getOrder(id) {
    return apiRequest(`/orders/${encodeURIComponent(id)}`);
  },

  getOrders() {
    return apiRequest("/orders?page=1&pageSize=50");
  },

  placeOrder(body) {
    return apiRequest("/orders/checkout", {
      method: "POST",
      body,
    });
  },

  cancelOrder(id) {
    return apiRequest(`/orders/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: {},
    });
  },
};

export default checkoutService;
