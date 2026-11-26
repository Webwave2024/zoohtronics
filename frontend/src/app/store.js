import { configureStore } from "@reduxjs/toolkit";
import catalogReducer from "../features/catalog/state/catalogSlice";
import cartReducer from "../features/cart/state/cartSlice";
import authReducer from "../features/auth/state/authSlice";
import checkoutReducer from "../features/checkout/state/checkoutSlice";
import compareReducer from "../features/catalog/state/compareSlice";

export const store = configureStore({
  reducer: {
    catalog: catalogReducer,
    cart: cartReducer,
    auth: authReducer,
    checkout: checkoutReducer,
    compare: compareReducer,
  },
});
