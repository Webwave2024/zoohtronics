import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  clearAuthError,
  fetchCurrentUser,
  signIn,
  signOut,
  signUp,
  updateAuthenticatedUser,
} from "../state/authSlice";

export function useAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  return {
    ...auth,
    isAuthenticated: auth.status === "authenticated",
    isChecking: auth.status === "checking",
    isAuthenticating: auth.status === "authenticating",
    isAdmin: auth.user?.role === "ADMIN" && auth.user?.status === "ACTIVE",
    login: (credentials) => dispatch(signIn(credentials)),
    register: (details) => dispatch(signUp(details)),
    logout: () => dispatch(signOut()),
    checkSession: () => dispatch(fetchCurrentUser()),
    clearError: () => dispatch(clearAuthError()),
    updateUser: (user) => dispatch(updateAuthenticatedUser(user)),
  };
}

export default useAuth;
