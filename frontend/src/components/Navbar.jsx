import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Upload,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import ImportModal from "./ImportModal";

export default function Navbar() {
  const {
    logout,
    accounts,
    selectedAccount,
    setSelectedAccount,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showImportModal, setShowImportModal] = useState(false);

  return (
    <>
      <header className="floating-navbar" style={styles.header}>
        <div style={styles.headerInner}>
          {/* Logo Brand */}
          <Link to="/" style={styles.logo}>
            <img src="/logo.png" alt="Tradr" style={styles.logoImage} />
            <div style={styles.logoCopy}>
              <span style={styles.logoTitle}>Tradr</span>
              <span style={styles.logoSubtitle}>Your personal trading journal</span>
            </div>
          </Link>

          {/* Right Action Controls */}
          <div style={styles.controls}>
            {/* Account Selector Dropdown */}
            <div style={styles.selectWrapper}>
              <select
                value={selectedAccount || ""}
                onChange={(e) => setSelectedAccount(e.target.value)}
                style={styles.select}
              >
                {accounts.length === 0 ? (
                  <option value="">No Accounts Connected</option>
                ) : (
                  <>
                    <option value="">All Accounts</option>
                    {accounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.accountName || acc.brokerUserId} ({acc.broker.toUpperCase()})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Import File Button */}
            <button
              className="btn btn-secondary"
              onClick={() => setShowImportModal(true)}
              style={styles.actionBtn}
            >
              <Upload size={15} />
              <span>Import file</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              className="btn btn-secondary"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={styles.themeBtn}
            >
              {theme === "dark" ? (
                <div style={styles.themePill}>
                  <Sun size={14} color="#fbbf24" />
                  <Moon size={14} color="#94a3b8" />
                </div>
              ) : (
                <div style={styles.themePill}>
                  <Sun size={14} color="#f59e0b" />
                  <Moon size={14} color="#64748b" />
                </div>
              )}
            </button>

            {/* Logout Button */}
            <button
              className="btn btn-secondary"
              onClick={logout}
              title="Logout"
              style={styles.actionBtn}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Quick CSV Import Modal */}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}
    </>
  );
}

const styles = {
  header: {
    height: "64px",
    background: "var(--bg-surface)",
    position: "static",
    zIndex: 50,
    transition: "background 0.25s ease, border-color 0.25s ease",
  },
  headerInner: {
    height: "100%",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textDecoration: "none",
  },
  logoImage: {
    width: "36px",
    height: "36px",
    objectFit: "contain",
    borderRadius: "8px",
    flexShrink: 0,
  },
  logoCopy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  logoTitle: {
    color: "var(--text-primary)",
    fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
    fontWeight: "600",
    fontSize: "1.3rem",
    letterSpacing: "0.2px",
    lineHeight: "1.1",
  },
  logoSubtitle: {
    color: "var(--text-muted)",
    fontWeight: "500",
    fontSize: "0.72rem",
    lineHeight: "1.2",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  selectWrapper: {
    position: "relative",
  },
  select: {
    background: "var(--bg-card)",
    border: "1px solid var(--bg-card-border)",
    borderRadius: "10px",
    color: "var(--text-primary)",
    padding: "8px 14px",
    fontSize: "0.85rem",
    fontWeight: "600",
    outline: "none",
    cursor: "pointer",
    transition: "var(--transition)",
  },
  actionBtn: {
    padding: "8px 14px",
    fontSize: "0.85rem",
    borderRadius: "10px",
  },
  themeBtn: {
    padding: "6px 10px",
    borderRadius: "20px",
  },
  themePill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
};
