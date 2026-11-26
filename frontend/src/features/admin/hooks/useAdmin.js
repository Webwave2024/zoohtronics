import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { signOut } from "../../auth/state/authSlice";
import adminService from "../service/adminService";

export function useAdmin() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === "ADMIN" && user?.status === "ACTIVE";

  return {
    user,
    isAdmin,
    adminRequest: adminService.adminRequest,
    uploadProductImage: adminService.uploadProductImage,
    logout: () => dispatch(signOut()),
  };
}

export default useAdmin;
