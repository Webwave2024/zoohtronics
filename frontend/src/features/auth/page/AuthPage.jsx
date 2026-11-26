import { useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { clearAuthError, signIn, signUp } from "../state/authSlice";

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const [isRegister, setIsRegister] = useState(location.pathname === "/register");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const returnTo = location.state?.from?.pathname || "/";

  if (auth.status === "authenticated") return <Navigate replace to={returnTo} />;

  function setField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    if (auth.error) dispatch(clearAuthError());
  }

  async function submit(event) {
    event.preventDefault();
    try {
      if (isRegister) {
        await dispatch(signUp(form)).unwrap();
      } else {
        await dispatch(signIn({ email: form.email, password: form.password })).unwrap();
      }
      navigate(returnTo, { replace: true });
    } catch {
      // The rejected thunk provides the inline error shown below.
    }
  }

  return (
    <main className="account-shell">
      <section className="auth-card">
        <Link className="auth-back" to="/"><ArrowLeft size={15} /> Back to shopping</Link>
        <div className="auth-card__icon"><LockKeyhole size={22} /></div>
        <p className="eyebrow">{isRegister ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</p>
        <h1>{isRegister ? "Make it yours." : "Good to see you."}</h1>
        <p className="auth-card__intro">{isRegister ? "Create an account to save your bag, track orders, and check out with ease." : "Sign in to see your saved laptops, bag, and orders."}</p>

        <form className="form-stack" onSubmit={submit}>
          {isRegister && (
            <div className="form-row">
              <label><span>First name</span><input name="firstName" autoComplete="given-name" required maxLength={100} value={form.firstName} onChange={setField} /></label>
              <label><span>Last name</span><input name="lastName" autoComplete="family-name" required maxLength={100} value={form.lastName} onChange={setField} /></label>
            </div>
          )}
          <label><span>Email address</span><input name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={setField} /></label>
          {isRegister && <label><span>Phone <small>(optional)</small></span><input name="phone" type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={setField} /></label>}
          <label><span>Password</span><input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : 1} maxLength={72} required value={form.password} onChange={setField} /></label>
          {auth.error && <p className="form-error" role="alert">{auth.error}</p>}
          <button className="button button--primary button--full auth-submit" type="submit" disabled={auth.status === "authenticating"}>
            {auth.status === "authenticating" ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            {auth.status !== "authenticating" && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to Zohntronics?"}
          <button type="button" onClick={() => {
            setIsRegister((current) => !current);
            dispatch(clearAuthError());
            navigate(isRegister ? "/login" : "/register", { replace: true, state: location.state });
          }}>{isRegister ? "Sign in" : "Create an account"}</button>
        </p>
      </section>
    </main>
  );
}
