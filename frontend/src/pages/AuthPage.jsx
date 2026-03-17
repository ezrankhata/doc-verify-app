import { useState } from "react";
import { Shield } from "lucide-react";
import { signup, login } from "../utils/userStore";
import { useUser } from "../context/UserContext";

export default function AuthPage() {
  const { authPage, setAuthPage, handleLogin } = useUser();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (authPage === "signup") {
        if (!form.name.trim()) throw new Error("Please enter your full name.");
        if (!form.email.trim()) throw new Error("Please enter your email address.");
        if (form.password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (form.password !== form.confirm) throw new Error("Passwords do not match.");
        handleLogin(signup(form.name.trim(), form.email.trim(), form.password));
      } else {
        handleLogin(login(form.email.trim(), form.password));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => { setAuthPage(tab); setError(null); setForm({ name: "", email: "", password: "", confirm: "" }); };

  return (
    <div className="auth-wrap">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Shield size={28} strokeWidth={2} />
          </div>
          <h1>DocVerify</h1>
          <p>Blockchain Document Verification Platform</p>
        </div>

        <div className="card">
          <div className="auth-tabs">
            <button className={`auth-tab ${authPage === "login" ? "active" : ""}`} onClick={() => switchTab("login")}>
              Sign In
            </button>
            <button className={`auth-tab ${authPage === "signup" ? "active" : ""}`} onClick={() => switchTab("signup")}>
              Create Account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {authPage === "signup" && (
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input className="input" type="text" placeholder="John Doe" value={form.name} onChange={set("name")} required />
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required />
            </div>
            {authPage === "signup" && (
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <input className="input" type="password" placeholder="••••••••" value={form.confirm} onChange={set("confirm")} required />
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 4 }} disabled={loading}>
              {loading ? <><span className="spinner" /> Please wait…</> : authPage === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="auth-switch">
            {authPage === "login" ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => switchTab(authPage === "login" ? "signup" : "login")}>
              {authPage === "login" ? "Sign up" : "Sign in"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
