import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import authService from "../service/authService";

const savedToken = localStorage.getItem("zohntronics-token");

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (credentials, { rejectWithValue }) => {
    try {
      const result = await authService.signIn(credentials);
      localStorage.setItem("zohntronics-token", result.token);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const signUp = createAsyncThunk(
  "auth/signUp",
  async (details, { rejectWithValue }) => {
    try {
      const result = await authService.signUp(details);
      localStorage.setItem("zohntronics-token", result.token);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: savedToken,
    user: null,
    status: savedToken ? "checking" : "guest",
    error: null,
  },
  reducers: {
    updateAuthenticatedUser(state, action) {
      state.user = action.payload;
    },
    signOut(state) {
      localStorage.removeItem("zohntronics-token");
      state.token = null;
      state.user = null;
      state.status = "guest";
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = "checking";
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "authenticated";
        state.token = localStorage.getItem("zohntronics-token");
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        localStorage.removeItem("zohntronics-token");
        state.token = null;
        state.user = null;
        state.status = "guest";
      })
      .addCase(signIn.pending, (state) => {
        state.status = "authenticating";
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.status = "authenticated";
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = "guest";
        state.error = action.payload || action.error.message;
      })
      .addCase(signUp.pending, (state) => {
        state.status = "authenticating";
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.status = "authenticated";
      })
      .addCase(signUp.rejected, (state, action) => {
        state.status = "guest";
        state.error = action.payload || action.error.message;
      });
  },
});

export const { updateAuthenticatedUser, signOut, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
