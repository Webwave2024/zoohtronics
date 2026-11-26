import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { signOut, updateAuthenticatedUser } from "../../auth/state/authSlice";
import { fetchAddresses, fetchOrders } from "../../checkout/state/checkoutSlice";
import accountService from "../service/accountService";

export function useAccount() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const checkout = useAppSelector((state) => state.checkout);

  return {
    user,
    addresses: checkout.addresses,
    addressesStatus: checkout.addressesStatus,
    addressesError: checkout.addressesError,
    orders: checkout.orders,
    ordersStatus: checkout.ordersStatus,
    ordersError: checkout.ordersError,
    fetchAddresses: () => dispatch(fetchAddresses()),
    fetchOrders: () => dispatch(fetchOrders()),
    updateProfile: (profile) => accountService.updateProfile(profile).then((res) => {
      dispatch(updateAuthenticatedUser(res.user));
      return res;
    }),
    updatePassword: (form) => accountService.updatePassword(form),
    deleteAddress: (id) => accountService.deleteAddress(id).then(() => dispatch(fetchAddresses())),
    signOut: () => dispatch(signOut()),
  };
}

export default useAccount;
