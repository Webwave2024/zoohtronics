import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  addCartItem,
  addWishlistItem,
  clearCartError,
  clearRemoteCart,
  clearWishlistError,
  fetchCart,
  fetchWishlist,
  removeCartItem,
  removeWishlistItem,
  resetCustomerCommerce,
  updateCartItem,
} from "../state/cartSlice";

export function useCart() {
  const dispatch = useAppDispatch();
  const { cart, wishlist, cartStatus, wishlistStatus, cartError, wishlistError } = useAppSelector(
    (state) => state.cart,
  );

  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const isWishlisted = (id) => wishlist.some((item) => item.id === id);

  return {
    cart,
    wishlist,
    cartStatus,
    wishlistStatus,
    cartError,
    wishlistError,
    itemCount,
    isWishlisted,
    fetchCart: () => dispatch(fetchCart()),
    addToCart: (laptopId, quantity = 1) => dispatch(addCartItem({ laptopId, quantity })),
    updateCartItem: (itemId, quantity) => dispatch(updateCartItem({ itemId, quantity })),
    removeCartItem: (itemId) => dispatch(removeCartItem(itemId)),
    clearCart: () => dispatch(clearRemoteCart()),
    fetchWishlist: () => dispatch(fetchWishlist()),
    addToWishlist: (laptopId) => dispatch(addWishlistItem(laptopId)),
    removeFromWishlist: (laptopId) => dispatch(removeWishlistItem(laptopId)),
    resetCommerce: () => dispatch(resetCustomerCommerce()),
    clearCartError: () => dispatch(clearCartError()),
    clearWishlistError: () => dispatch(clearWishlistError()),
  };
}

export default useCart;
