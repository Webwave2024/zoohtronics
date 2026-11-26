import { apiRequest } from "../../../shared/api/client";

export const authService = {
  getCurrentUser() {
    return apiRequest("/auth/me");
  },

  signIn(credentials) {
    return apiRequest("/auth/login", {
      method: "POST",
      body: credentials,
      token: "",
    });
  },

  signUp(details) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: details,
      token: "",
    });
  },

  updateProfile(profile) {
    return apiRequest("/auth/profile", {
      method: "PUT",
      body: profile,
    });
  },
};

export default authService;
