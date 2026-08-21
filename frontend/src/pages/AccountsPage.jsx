import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import PageTitle from "../components/PageTitle";
import { Building2, Plus, Upload, CheckCircle2, Power, AlertCircle, History, Clock } from "lucide-react";
import ImportModal from "../components/ImportModal";
import ConnectUpstoxButton from "../components/ConnectUpstoxButton";
import SyncTodayButton from "../components/SyncTodayButton";
import HistoricalSyncModal from "../components/HistoricalSyncModal";

export default function AccountsPage() {
  const { accounts, fetchAccounts } = useAuth();
  const [showImportModal, setShowImportModal] = useState(false);
  const [historicalSyncAccount, setHistoricalSyncAccount] = useState(null); // { _id, accountName }

  // New Account Form State
  const [broker, setBroker] = useState("upstox");
  const [accountName, setAccountName] = useState("");
  const [brokerUserId, setBrokerUserId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setError("");
    setAdding(true);

    try {
      await api.post("/account", {
        broker,
        accountName,
        brokerUserId,
      });

      setAccountName("");
      setBrokerUserId("");
      await fetchAccounts();
    } catch (err) {
      setError(err.message || "Failed to connect broker account.");
    } finally {
      setAdding(false);
    }
  };

  const handleDisconnect = async (accountId) => {
    if (!window.confirm("Are you sure you want to disconnect this broker account?")) return;

    try {
      await api.patch(`/account/${accountId}/disconnect`);
      await fetchAccounts();
    } catch (err) {
      alert(`Failed to disconnect account: ${err.message}`);
    }
  };

  return (
    <div>
      <PageTitle
        title="Broker Accounts & CSV Data Imports"
        subtitle="Manage connected broker accounts and upload trade execution reports"
        extraContent={
          <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
            <Upload size={16} />
            <span>Import CSV Executions</span>
          </button>
        }
      />

      <div className="grid-2col">
        {/* Connected Accounts List */}
        <div className="card">
          <h3 style={styles.cardTitle}>
            <Building2 size={18} color="#3b82f6" /> Connected Broker Accounts
          </h3>

          {accounts.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "20px 0" }}>
              No broker accounts connected yet. Add your Upstox, Zerodha, or Groww account using the form on the right.
            </p>
          ) : (
            <div style={styles.accountList}>
              {accounts.map((acc) => (
                <div key={acc._id} style={styles.accCard}>
                  <div style={styles.accInfo}>
                    <div style={styles.accIcon}>
                      {acc.broker.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={styles.accName}>{acc.accountName || "My Broker Account"}</h4>
                      <p style={styles.accSub}>
                        Broker ID: <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{acc.brokerUserId}</span> ({acc.broker.toUpperCase()})
                      </p>
                      {acc.lastSyncedAt && (
                        <p style={styles.lastSynced}>
                          <Clock size={11} style={{ verticalAlign: "middle", marginRight: "3px" }} />
                          Last synced: {new Date(acc.lastSyncedAt).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={styles.accActions}>
                    <span className={`badge ${acc.isActive ? "badge-profit" : "badge-neutral"}`}>
                      {acc.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>

                    {/* Upstox-specific sync controls */}
                    {acc.isActive && acc.broker === "upstox" && (
                      <>
                        <SyncTodayButton
                          accountId={acc._id}
                          onSyncSuccess={() => fetchAccounts()}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          onClick={() => setHistoricalSyncAccount(acc)}
                          title="Historical Trade Sync"
                        >
                          <History size={14} />
                          <span>History</span>
                        </button>
                      </>
                    )}

                    {acc.isActive && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                        onClick={() => handleDisconnect(acc._id)}
                        title="Disconnect Account"
                      >
                        <Power size={14} /> Disconnect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Broker Account Form */}
        <div className="card">
          <h3 style={styles.cardTitle}>
            <Plus size={18} color="#10b981" /> Connect New Broker Account
          </h3>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Upstox OAuth section */}
          {broker === "upstox" && (
            <div style={styles.oauthBox}>
              <p style={styles.oauthText}>
                Upstox uses <strong>OAuth 2.0</strong> — click below to securely authorize your account.
                You will be redirected to Upstox and brought back automatically.
              </p>
              <ConnectUpstoxButton style={{ width: "100%" }} />
              <div style={styles.divider}>
                <span style={styles.dividerText}>or register account manually</span>
              </div>
            </div>
          )}

          <form onSubmit={handleAddAccount}>
            <div className="form-group">
              <label className="form-label">Broker Platform</label>
              <select
                className="form-select"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
              >
                <option value="upstox">Upstox</option>
                <option value="zerodha">Zerodha</option>
                <option value="groww">Groww</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Label Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. My Upstox Account"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Broker Client / User ID</label>
              <input
                type="text"
                required
                className="form-input"
                value={brokerUserId}
                onChange={(e) => setBrokerUserId(e.target.value)}
                placeholder="e.g. UP123456"
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: "12px" }}
              disabled={adding}
            >
              {adding ? "Registering Account..." : "Register Account (Manual)"}
            </button>
          </form>
        </div>
      </div>

      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}

      {historicalSyncAccount && (
        <HistoricalSyncModal
          accountId={historicalSyncAccount._id}
          accountName={historicalSyncAccount.accountName}
          onClose={() => setHistoricalSyncAccount(null)}
          onSyncSuccess={() => {
            fetchAccounts();
            setHistoricalSyncAccount(null);
          }}
        />
      )}
    </div>
  );
}

const styles = {
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
  },
  pageTitle: {
    fontSize: "1.6rem",
    fontWeight: "800",
    color: "var(--text-primary)",
  },
  pageSubtitle: {
    fontSize: "0.88rem",
    color: "var(--text-muted)",
  },
  cardTitle: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  accountList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  accCard: {
    background: "var(--bg-surface)",
    border: "1px solid var(--bg-card-border)",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  accIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "var(--color-accent-bg)",
    color: "var(--color-accent)",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  accName: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  accSub: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  accActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  errorBox: {
    background: "var(--color-loss-bg)",
    border: "1px solid rgba(244, 63, 94, 0.3)",
    color: "var(--color-loss)",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  lastSynced: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
    gap: "3px",
  },
  oauthBox: {
    background: "var(--bg-surface)",
    border: "1px solid var(--color-accent)",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "16px",
  },
  oauthText: {
    fontSize: "0.84rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
    marginBottom: "14px",
  },
  divider: {
    textAlign: "center",
    position: "relative",
    margin: "16px 0 0",
    borderTop: "1px solid var(--bg-card-border)",
    paddingTop: "12px",
  },
  dividerText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
};
