import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import checkoutService from "../service/checkoutService";

const withError = (error, rejectWithValue) => rejectWithValue(error.message || "Request failed.");

export const fetchAddresses = createAsyncThunk("checkout/fetchAddresses", async (_, { rejectWithValue }) => {
  try {
    return (await checkoutService.getAddresses()).addresses;
  } catch (error) {
    return withError(error, rejectWithValue);
  }
});

export const createAddress = createAsyncThunk("checkout/createAddress", async (body, { rejectWithValue }) => {
  try {
    const created = (await checkoutService.createAddress(body)).address;
    const addresses = (await checkoutService.getAddresses()).addresses;
    return { created, addresses };
  } catch (error) {
    return withError(error, rejectWithValue);
  }
});

export const fetchOrder = createAsyncThunk("checkout/fetchOrder", async (id, { rejectWithValue }) => {
  try {
    return (await checkoutService.getOrder(id)).order;
  } catch (error) {
    return withError(error, rejectWithValue);
  }
});

export const fetchOrders = createAsyncThunk("checkout/fetchOrders", async (_, { rejectWithValue }) => {
  try {
    return (await checkoutService.getOrders()).items;
  } catch (error) {
    return withError(error, rejectWithValue);
  }
});

export const placeOrder = createAsyncThunk("checkout/placeOrder", async (body, { rejectWithValue }) => {
  try {
    return (await checkoutService.placeOrder(body)).order;
  } catch (error) {
    return withError(error, rejectWithValue);
  }
});

export const cancelOrder = createAsyncThunk("checkout/cancelOrder", async (id, { rejectWithValue }) => {
  try {
    return (await checkoutService.cancelOrder(id)).order;
  } catch (error) {
    return withError(error, rejectWithValue);
  }
});

const checkoutSlice = createSlice({
  name: "checkout",
  initialState: {
    addresses: [],
    orders: [],
    ordersStatus: "idle",
    ordersError: null,
    addressesStatus: "idle",
    addressesError: null,
    saveAddressStatus: "idle",
    saveAddressError: null,
    order: null,
    orderStatus: "idle",
    orderError: null,
    placeOrderStatus: "idle",
    placeOrderError: null,
    cancelStatus: "idle",
    cancelError: null,
  },
  reducers: {
    clearCheckoutErrors(state) {
      state.addressesError = null;
      state.saveAddressError = null;
      state.orderError = null;
      state.placeOrderError = null;
      state.cancelError = null;
    },
    clearCurrentOrder(state) {
      state.order = null;
      state.orderStatus = "idle";
      state.orderError = null;
      state.placeOrderStatus = "idle";
      state.placeOrderError = null;
    },
    clearCustomerData(state) {
      state.addresses = [];
      state.addressesStatus = "idle";
      state.addressesError = null;
      state.orders = [];
      state.ordersStatus = "idle";
      state.ordersError = null;
      state.order = null;
      state.orderStatus = "idle";
      state.orderError = null;
      state.saveAddressStatus = "idle";
      state.saveAddressError = null;
      state.cancelStatus = "idle";
      state.cancelError = null;
      state.placeOrderStatus = "idle";
      state.placeOrderError = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.addressesStatus = "loading";
        state.addressesError = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.addressesStatus = "succeeded";
        state.addresses = action.payload;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.addressesStatus = "failed";
        state.addressesError = action.payload || action.error.message;
      })
      .addCase(createAddress.pending, (state) => {
        state.saveAddressStatus = "loading";
        state.saveAddressError = null;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.saveAddressStatus = "succeeded";
        state.addresses = action.payload.addresses;
      })
      .addCase(createAddress.rejected, (state, action) => {
        state.saveAddressStatus = "failed";
        state.saveAddressError = action.payload || action.error.message;
      })
      .addCase(fetchOrder.pending, (state) => {
        state.orderStatus = "loading";
        state.orderError = null;
        state.order = null;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        state.orderStatus = "succeeded";
        state.order = action.payload;
      })
      .addCase(fetchOrder.rejected, (state, action) => {
        state.orderStatus = "failed";
        state.orderError = action.payload || action.error.message;
      })
      .addCase(fetchOrders.pending, (state) => {
        state.ordersStatus = "loading";
        state.ordersError = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.ordersStatus = "succeeded";
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.ordersStatus = "failed";
        state.ordersError = action.payload || action.error.message;
      })
      .addCase(placeOrder.pending, (state) => {
        state.placeOrderStatus = "loading";
        state.placeOrderError = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placeOrderStatus = "succeeded";
        state.order = action.payload;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.placeOrderStatus = "failed";
        state.placeOrderError = action.payload || action.error.message;
      })
      .addCase(cancelOrder.pending, (state) => {
        state.cancelStatus = "loading";
        state.cancelError = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.cancelStatus = "succeeded";
        state.order = action.payload;
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.cancelStatus = "failed";
        state.cancelError = action.payload || action.error.message;
      });
  },
});

export const { clearCheckoutErrors, clearCurrentOrder, clearCustomerData } = checkoutSlice.actions;
export default checkoutSlice.reducer;
