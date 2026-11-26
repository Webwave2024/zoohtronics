import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  cancelOrder,
  clearCheckoutErrors,
  clearCurrentOrder,
  clearCustomerData,
  createAddress,
  fetchAddresses,
  fetchOrder,
  fetchOrders,
  placeOrder,
} from "../state/checkoutSlice";
import { startOnlinePayment } from "../service/payment";

export function useCheckout() {
  const dispatch = useAppDispatch();
  const checkout = useAppSelector((state) => state.checkout);

  return {
    ...checkout,
    fetchAddresses: () => dispatch(fetchAddresses()),
    createAddress: (address) => dispatch(createAddress(address)),
    fetchOrder: (id) => dispatch(fetchOrder(id)),
    fetchOrders: () => dispatch(fetchOrders()),
    placeOrder: (orderPayload) => dispatch(placeOrder(orderPayload)),
    cancelOrder: (id) => dispatch(cancelOrder(id)),
    clearErrors: () => dispatch(clearCheckoutErrors()),
    clearOrder: () => dispatch(clearCurrentOrder()),
    clearAllCustomerData: () => dispatch(clearCustomerData()),
    startPayment: (options) => startOnlinePayment(options),
  };
}

export default useCheckout;
