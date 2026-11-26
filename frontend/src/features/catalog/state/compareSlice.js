import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  compareItems: [],
  isModalOpen: false,
};

const compareSlice = createSlice({
  name: "compare",
  initialState,
  reducers: {
    toggleCompareItem(state, action) {
      const product = action.payload;
      const index = state.compareItems.findIndex((item) => item.id === product.id);
      if (index >= 0) {
        state.compareItems.splice(index, 1);
      } else {
        if (state.compareItems.length >= 4) {
          state.compareItems.shift();
        }
        state.compareItems.push(product);
      }
    },
    removeCompareItem(state, action) {
      const id = action.payload;
      state.compareItems = state.compareItems.filter((item) => item.id !== id);
      if (state.compareItems.length === 0) {
        state.isModalOpen = false;
      }
    },
    clearCompareItems(state) {
      state.compareItems = [];
      state.isModalOpen = false;
    },
    openCompareModal(state) {
      if (state.compareItems.length > 0) {
        state.isModalOpen = true;
      }
    },
    closeCompareModal(state) {
      state.isModalOpen = false;
    },
  },
});

export const {
  toggleCompareItem,
  removeCompareItem,
  clearCompareItems,
  openCompareModal,
  closeCompareModal,
} = compareSlice.actions;

export default compareSlice.reducer;
