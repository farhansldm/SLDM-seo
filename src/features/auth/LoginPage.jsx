import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "./AuthProvider.jsx";

const initialLogin = { email: "", password: "" };
const initialSignup = { agencyName: "", fullName: "", email: "", password: "" };

export function LoginPage() {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [signupForm, setSignupForm] = useState(initialSignup);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from?.pathname ?? "/";

  if (isAuthenticated) {
    return <Navigate replace to={returnTo} />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(loginForm);
      } else {
        const result = await signUp(signupForm);
        if (result?.needsEmailConfirmation) {
          setNotice("Check your email to confirm your Supabase account, then login.");
          setMode("login");
          return;
        }
      }
      navigate(returnTo, { replace: true });
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label="Authentication">
        <div className="auth-copy">
          <span>Secure agency workspace</span>
          <h1>Sign in to manage SEO operations by tenant and role.</h1>
          <p>Admin, manager, employee, and client access are enforced from the API through the React workspace.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button aria-selected={mode === "login"} onClick={() => setMode("login")} role="tab" type="button">
              Login
            </button>
            <button aria-selected={mode === "signup"} onClick={() => setMode("signup")} role="tab" type="button">
              Signup
            </button>
          </div>

          {mode === "signup" ? (
            <>
              <label>
                Agency name
                <input
                  autoComplete="organization"
                  onChange={(event) => setSignupForm({ ...signupForm, agencyName: event.target.value })}
                  required
                  value={signupForm.agencyName}
                />
              </label>
              <label>
                Full name
                <input
                  autoComplete="name"
                  onChange={(event) => setSignupForm({ ...signupForm, fullName: event.target.value })}
                  required
                  value={signupForm.fullName}
                />
              </label>
            </>
          ) : null}

          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) =>
                mode === "login"
                  ? setLoginForm({ ...loginForm, email: event.target.value })
                  : setSignupForm({ ...signupForm, email: event.target.value })
              }
              required
              type="email"
              value={mode === "login" ? loginForm.email : signupForm.email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              onChange={(event) =>
                mode === "login"
                  ? setLoginForm({ ...loginForm, password: event.target.value })
                  : setSignupForm({ ...signupForm, password: event.target.value })
              }
              required
              type="password"
              value={mode === "login" ? loginForm.password : signupForm.password}
            />
          </label>

          {notice ? <p className="auth-notice">{notice}</p> : null}
          {error ? <p className="auth-error">{error}</p> : null}
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Please wait" : mode === "login" ? "Login" : "Create agency"}
          </button>
        </form>
      </section>
    </main>
  );
}
