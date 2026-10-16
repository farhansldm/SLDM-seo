import { useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Alert, Button, IconButton, Input } from "../../components/ui/index.js";
import { useAuth } from "./AuthProvider.jsx";

const initialLogin = { email: "", password: "" };
const initialSignup = { agencyName: "", fullName: "", email: "", password: "" };

function friendlyAuthError(message = "") {
  const normalized = message.toLowerCase();
  if (normalized.includes("email not confirmed")) return { title: "Confirm your email", message: "Open the confirmation link sent to your inbox, then return here to sign in." };
  if (normalized.includes("rate limit") || normalized.includes("too many")) return { title: "Too many attempts", message: "Supabase has temporarily limited authentication requests. Wait a few minutes before trying again." };
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) return { title: "Email or password is incorrect", message: "Check your details or reset your password if you cannot remember it." };
  if (normalized.includes("expired") || normalized.includes("session")) return { title: "Your session ended", message: "Sign in again to continue securely." };
  if (normalized.includes("fetch") || normalized.includes("network")) return { title: "Authentication service unavailable", message: "Check your connection and try again. Your details have not been changed." };
  return { title: "We could not complete that request", message: message || "Try again in a moment." };
}

function validate(mode, form) {
  const errors = {};
  if (mode === "signup" && form.agencyName.trim().length < 2) errors.agencyName = "Enter your agency or business name.";
  if (mode === "signup" && form.fullName.trim().length < 2) errors.fullName = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address.";
  if ((mode === "signup" || mode === "new-password") && form.password.length < 8) errors.password = "Use at least 8 characters.";
  if (mode === "login" && !form.password) errors.password = "Enter your password.";
  return errors;
}

export function LoginPage() {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [signupForm, setSignupForm] = useState(initialSignup);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { authError, isAuthenticated, isPasswordRecovery, requestPasswordReset, signIn, signUp, updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from?.pathname ?? "/";

  const activeMode = isPasswordRecovery ? "new-password" : mode;
  const presentedError = useMemo(() => friendlyAuthError(error || authError), [authError, error]);

  if (isAuthenticated && activeMode !== "new-password") return <Navigate replace to={returnTo} />;

  function changeMode(nextMode) {
    setMode(nextMode); setError(""); setNotice(""); setErrors({}); setShowPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault(); setError(""); setNotice("");
    const form = activeMode === "signup" ? signupForm : activeMode === "recovery" ? { email: recoveryEmail, password: "" } : activeMode === "new-password" ? { email: "recovery@local", password: newPassword } : loginForm;
    const nextErrors = validate(activeMode, form); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setIsSubmitting(true);
    try {
      if (activeMode === "login") await signIn(loginForm);
      if (activeMode === "signup") {
        const result = await signUp(signupForm);
        if (result?.needsEmailConfirmation) { setMode("confirmation"); setNotice("We sent a confirmation link to your inbox. Confirm your email before signing in."); setErrors({}); return; }
      }
      if (activeMode === "recovery") { await requestPasswordReset(recoveryEmail); setNotice("Password reset instructions are on their way. Check your inbox and spam folder."); return; }
      if (activeMode === "new-password") { await updatePassword(newPassword); setNotice("Your password has been updated. You can continue to your workspace."); navigate("/", { replace: true }); return; }
      navigate(returnTo, { replace: true });
    } catch (authRequestError) { setError(authRequestError.message); } finally { setIsSubmitting(false); }
  }

  const passwordValue = activeMode === "signup" ? signupForm.password : activeMode === "new-password" ? newPassword : loginForm.password;
  const setPassword = (value) => activeMode === "signup" ? setSignupForm({ ...signupForm, password: value }) : activeMode === "new-password" ? setNewPassword(value) : setLoginForm({ ...loginForm, password: value });

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label="Authentication">
        <div className="auth-copy">
          <div className="auth-brand"><span aria-hidden="true">S</span><strong>SLDM</strong></div>
          <div><span className="auth-eyebrow">SEO operations workspace</span><h1>Turn search data into accountable work.</h1><p>Manage websites, technical health, keyword movement, tasks, and client delivery from one secure workspace.</p></div>
          <ul><li><ShieldCheck size={17} /> Role-based workspace access</li><li><LockKeyhole size={17} /> Supabase-secured authentication</li></ul>
        </div>

        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          {activeMode === "login" || activeMode === "signup" ? <><div className="auth-heading"><span>{activeMode === "login" ? "Welcome back" : "Create your workspace"}</span><h2>{activeMode === "login" ? "Sign in to SLDM" : "Start with your agency"}</h2><p>{activeMode === "login" ? "Use the email connected to your workspace." : "Your first client and website come next."}</p></div><div className="auth-tabs" role="tablist" aria-label="Authentication mode"><button aria-selected={activeMode === "login"} onClick={() => changeMode("login")} role="tab" type="button">Sign in</button><button aria-selected={activeMode === "signup"} onClick={() => changeMode("signup")} role="tab" type="button">Create account</button></div></> : null}

          {activeMode === "signup" ? <><Input autoComplete="organization" error={errors.agencyName} label="Agency or business name" onChange={(event) => setSignupForm({ ...signupForm, agencyName: event.target.value })} required value={signupForm.agencyName} /><Input autoComplete="name" error={errors.fullName} label="Your full name" onChange={(event) => setSignupForm({ ...signupForm, fullName: event.target.value })} required value={signupForm.fullName} /></> : null}

          {activeMode === "recovery" ? <div className="auth-heading auth-heading--compact"><span><KeyRound size={18} /> Account recovery</span><h2>Reset your password</h2><p>We will email you a secure link to choose a new password.</p></div> : null}
          {activeMode === "new-password" ? <div className="auth-heading auth-heading--compact"><span><KeyRound size={18} /> Secure your account</span><h2>Choose a new password</h2><p>Use at least eight characters that you do not reuse elsewhere.</p></div> : null}
          {activeMode === "confirmation" ? <div className="auth-confirmation"><span><MailCheck size={26} /></span><h2>Confirm your email</h2><p>{notice || "Open the confirmation link in your inbox, then return here to sign in."}</p><Button onClick={() => changeMode("login")} variant="secondary">Return to sign in</Button></div> : null}

          {(activeMode === "login" || activeMode === "signup") ? <Input autoComplete="email" error={errors.email} label="Email address" onChange={(event) => activeMode === "login" ? setLoginForm({ ...loginForm, email: event.target.value }) : setSignupForm({ ...signupForm, email: event.target.value })} required type="email" value={activeMode === "login" ? loginForm.email : signupForm.email} /> : null}
          {activeMode === "recovery" ? <Input autoComplete="email" error={errors.email} label="Email address" onChange={(event) => setRecoveryEmail(event.target.value)} required type="email" value={recoveryEmail} /> : null}

          {activeMode !== "recovery" && activeMode !== "confirmation" ? <div className="auth-password"><Input autoComplete={activeMode === "login" ? "current-password" : "new-password"} error={errors.password} hint={activeMode === "signup" ? "At least 8 characters" : undefined} label={activeMode === "new-password" ? "New password" : "Password"} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? "text" : "password"} value={passwordValue} /><IconButton icon={showPassword ? EyeOff : Eye} label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)} /></div> : null}

          {(error || authError) ? <Alert tone="error" title={presentedError.title}>{presentedError.message}</Alert> : null}
          {notice && activeMode !== "confirmation" ? <Alert tone="success">{notice}</Alert> : null}

          {activeMode !== "confirmation" ? <Button disabled={isSubmitting} size="lg" type="submit">{isSubmitting ? "Please wait..." : activeMode === "login" ? "Sign in" : activeMode === "signup" ? "Create workspace" : activeMode === "recovery" ? "Send reset link" : "Update password"}</Button> : null}
          {activeMode === "login" ? <button className="auth-text-button" onClick={() => { setRecoveryEmail(loginForm.email); changeMode("recovery"); }} type="button">Forgot your password?</button> : null}
          {activeMode === "recovery" && !isPasswordRecovery ? <button className="auth-text-button" onClick={() => changeMode("login")} type="button"><ArrowLeft size={15} /> Back to sign in</button> : null}
        </form>
      </section>
    </main>
  );
}
