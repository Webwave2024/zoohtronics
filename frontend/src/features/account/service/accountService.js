import { apiRequest } from "../../../shared/api/client";

export const accountService = {
  updateProfile(profile) {
    return apiRequest("/account/profile", {
      method: "PATCH",
      body: profile,
    });
  },

  updatePassword(passwordForm) {
    return apiRequest("/account/password", {
      method: "POST",
      body: passwordForm,
    });
  },

  getAddresses() {
    return apiRequest("/account/addresses");
  },

  addAddress(address) {
    return apiRequest("/account/addresses", {
      method: "POST",
      body: address,
    });
  },

  deleteAddress(id) {
    return apiRequest(`/account/addresses/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  getOrders() {
    return apiRequest("/orders?page=1&pageSize=50");
  },
};

export default accountService;
