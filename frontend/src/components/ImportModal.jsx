import React, { useState } from "react";
import { X, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export default function ImportModal({ onClose }) {
  const { accounts, selectedAccount, fetchAccounts } = useAuth();
  
  const [targetAccount, setTargetAccount] = useState(selectedAccount || (accounts[0]?._id || ""));
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file (.csv, .xlsx, .xls) to upload.");
      return;
    }
    if (!targetAccount) {
      setError("Please select a broker account.");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("accountId", targetAccount);

      const response = await api.uploadCsv("/imports/csv", formData);
      setResult(response);
      fetchAccounts();
    } catch (err) {
      setError(err.message || "Failed to parse and import trade file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={styles.iconBox}>
              <Upload size={18} color="var(--color-accent)" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)" }}>
                Import Trade Executions
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Upload Upstox, Zerodha, or Groww trade report file (CSV/Excel) to auto-match positions
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleUpload}>
            {/* Target Account Selector */}
            <div className="form-group">
              <label className="form-label">Select Target Broker Account</label>
              <select
                className="form-select"
                value={targetAccount}
                onChange={(e) => setTargetAccount(e.target.value)}
              >
                <option value="">Select account...</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.accountName || acc.brokerUserId} ({acc.broker.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop File Zone */}
            <div className="form-group">
              <label className="form-label">Broker Trade File (Upstox / Zerodha / Groww)</label>
              <div
                style={styles.dropZone}
                onClick={() => document.getElementById("csvInput").click()}
              >
                <FileText size={32} color={file ? "var(--color-profit)" : "var(--text-muted)"} />
                <p style={{ fontSize: "0.9rem", fontWeight: "600", color: file ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  {file ? file.name : "Click or drag & drop file here (.csv, .xlsx, .xls)"}
                </p>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Supports standard Upstox, Zerodha, & Groww trade export csv,xlsx,xls files up to 10MB
                </span>
                <input
                  id="csvInput"
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={styles.footer}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
                {uploading ? "Processing FIFO Matching..." : "Upload & Process Executions"}
              </button>
            </div>
          </form>
        ) : (
          /* Result Audit Box */
          <div>
            <div style={styles.successHeader}>
              <CheckCircle2 size={32} color="var(--color-profit)" />
              <h4 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-profit)", marginTop: "8px" }}>
                CSV Executions Processed Successfully!
              </h4>
            </div>

            <div style={styles.resultGrid}>
              <div style={styles.resultCard}>
                <span style={styles.resVal}>{result.totalRowsInCsv}</span>
                <span style={styles.resLbl}>Total CSV Rows</span>
              </div>
              <div style={styles.resultCard}>
                <span style={{ ...styles.resVal, color: "var(--color-profit)" }}>{result.newExecutionsImported}</span>
                <span style={styles.resLbl}>New Executions</span>
              </div>
              <div style={styles.resultCard}>
                <span style={{ ...styles.resVal, color: "var(--color-warning)" }}>{result.duplicateExecutions}</span>
                <span style={styles.resLbl}>Duplicates Skipped</span>
              </div>
              <div style={styles.resultCard}>
                <span style={{ ...styles.resVal, color: "var(--color-accent)" }}>{result.fifoSummary?.processedCount || 0}</span>
                <span style={styles.resLbl}>FIFO Executions Matched</span>
              </div>
            </div>

            <p style={{ marginTop: "12px", textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              * Calculated position P&Ls represent Gross P&L (excludes brokerage fees & taxes).
            </p>

            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <button className="btn btn-primary" onClick={onClose}>
                Done & View Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "1px solid var(--bg-card-border)",
  },
  iconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "var(--color-accent-bg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropZone: {
    border: "2px dashed var(--bg-card-border)",
    borderRadius: "12px",
    padding: "32px",
    textAlign: "center",
    cursor: "pointer",
    background: "var(--bg-surface)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  },
  errorBox: {
    background: "rgba(244, 63, 94, 0.15)",
    border: "1px solid rgba(244, 63, 94, 0.3)",
    color: "var(--color-loss)",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "12px",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
  },
  successHeader: {
    textAlign: "center",
    padding: "16px 0",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "16px",
  },
  resultCard: {
    background: "var(--bg-surface)",
    border: "1px solid var(--bg-card-border)",
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  resVal: {
    fontSize: "1.4rem",
    fontWeight: "800",
    fontFamily: "var(--font-mono)",
    color: "var(--text-primary)",
  },
  resLbl: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    fontWeight: "600",
  },
};
