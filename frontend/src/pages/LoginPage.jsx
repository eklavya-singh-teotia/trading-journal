import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="card" style={styles.card}>
        <div style={styles.logoHeader}>
          <div style={styles.logoIcon}>
            <img src="/logo.png" alt="Tradr" style={styles.logoImage} />
          </div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Sign in to Tradr</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#64748b" style={styles.inputIcon} />
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: "38px", width: "100%" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@example.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: "38px", width: "100%" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "12px", padding: "12px" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In to Journal"}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Don't have an account? </span>
          <Link to="/register" style={{ color: "#3b82f6", fontWeight: "600", fontSize: "0.85rem", textDecoration: "none" }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "var(--bg-dark)",
  },
  card: {
    maxWidth: "420px",
    width: "100%",
    padding: "36px 32px",
  },
  logoHeader: {
    textAlign: "center",
    marginBottom: "24px",
  },
  logoIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  logoImage: {
    width: "48px",
    height: "48px",
    objectFit: "contain",
    borderRadius: "12px",
  },
  title: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "var(--text-primary)",
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    marginTop: "4px",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    pointerEvents: "none",
  },
  errorBox: {
    background: "rgba(244, 63, 94, 0.15)",
    border: "1px solid rgba(244, 63, 94, 0.3)",
    color: "#f43f5e",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  footer: {
    textAlign: "center",
    marginTop: "20px",
    paddingTop: "16px",
    borderTop: "1px solid var(--bg-card-border)",
  },
};
