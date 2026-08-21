import React, { useState } from "react";
import { X, History, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

const SEGMENTS = [
  { value: "", label: "ALL — All Segments" },
  { value: "EQ", label: "EQ — Equity" },
  { value: "FO", label: "FO — Futures & Options" },
  { value: "CD", label: "CD — Currency Derivatives" },
  { value: "COM", label: "COM — Commodities" },
];

function getDefaultDates() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { defaultStart: fmt(thirtyDaysAgo), defaultEnd: fmt(today) };
}

/**
 * Historical sync modal for Upstox accounts.
 *
 * POST /api/v1/upstox/sync/:accountId
 * Body: { startDate, endDate, segment? }
 *
 * Shows an audit result grid with fetched / inserted / duplicates / processed / fifoStatus.
 */
export default function HistoricalSyncModal({ accountId, accountName, onClose, onSyncSuccess }) {
  const { showToast } = useToast();
  const { defaultStart, defaultEnd } = getDefaultDates();

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [segment, setSegment] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSync = async (e) => {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }
    if (startDate > endDate) {
      setError("Start date cannot be later than end date.");
      return;
    }

    setLoading(true);

    const body = { startDate, endDate };
    if (segment) body.segment = segment;

    try {
      const data = await api.post(`/upstox/sync/${accountId}`, body);
      setResult(data);
      showToast(
        `Historical sync complete — ${data.inserted ?? 0} new executions inserted.`,
        "success"
      );
      if (typeof onSyncSuccess === "function") {
        onSyncSuccess(data);
      }
    } catch (err) {
      setError(err.message || "Historical sync failed. Please try again.");
      showToast(err.message || "Historical sync failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={styles.iconBox}>
              <History size={18} color="#3b82f6" />
            </div>
            <div>
              <h3 style={styles.title}>Historical Trade Sync</h3>
              <p style={styles.subtitle}>
                {accountName ? `Syncing: ${accountName}` : "Fetch & process historical executions from Upstox"}
              </p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleSync}>
            {/* Date Range */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  min={startDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Segment Selector */}
            <div className="form-group">
              <label className="form-label">Segment Filter</label>
              <select
                className="form-select"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              >
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Info note */}
            <p style={styles.infoNote}>
              The backend paginates Upstox historical trades automatically (100 per page). Large date ranges may take a few seconds.
            </p>

            {/* Footer Actions */}
            <div style={styles.footer}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spin" style={{ display: "inline-flex" }}>
                      <History size={15} />
                    </span>
                    Syncing...
                  </>
                ) : (
                  <>
                    <History size={15} />
                    Run Historical Sync
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Audit Result */
          <div>
            <div style={styles.successHeader}>
              <CheckCircle2 size={34} color="var(--color-profit)" />
              <h4 style={styles.successTitle}>Historical Sync Completed!</h4>
              <p style={styles.successSubtitle}>
                {startDate} → {endDate}
                {segment ? ` · Segment: ${segment}` : " · All Segments"}
              </p>
            </div>

            <div style={styles.resultGrid}>
              <ResultCard label="Trades Fetched" value={result.fetched ?? 0} color="var(--text-primary)" />
              <ResultCard label="Unique Fetched" value={result.uniqueFetched ?? result.fetched ?? 0} color="var(--color-accent)" />
              <ResultCard label="New Executions" value={result.inserted ?? 0} color="var(--color-profit)" />
              <ResultCard label="Duplicates Skipped" value={result.duplicates ?? 0} color="var(--color-warning)" />
              <ResultCard label="FIFO Matched" value={result.processed ?? 0} color="#8b5cf6" />
              <ResultCard
                label="FIFO Status"
                value={result.fifoStatus || "OK"}
                color="var(--color-accent)"
                mono={false}
                small
              />
            </div>

            <p style={styles.disclaimer}>
              * Gross P&amp;L figures exclude brokerage fees &amp; taxes.
            </p>

            <div style={{ marginTop: "20px", textAlign: "right", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setResult(null)}
              >
                Sync Again
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ label, value, color, mono = true, small = false }) {
  return (
    <div style={styles.resultCard}>
      <span
        style={{
          fontSize: small ? "1.05rem" : "1.5rem",
          fontWeight: "800",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-main)",
          color,
          letterSpacing: mono ? "-0.5px" : "0",
        }}
      >
        {value}
      </span>
      <span style={styles.resultLabel}>{label}</span>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
    paddingBottom: "14px",
    borderBottom: "1px solid var(--bg-card-border)",
  },
  iconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "rgba(59, 130, 246, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  subtitle: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    marginTop: "2px",
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
    marginBottom: "14px",
  },
  infoNote: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    lineHeight: "1.5",
    background: "var(--bg-surface)",
    border: "1px solid var(--bg-card-border)",
    borderRadius: "8px",
    padding: "10px 14px",
    marginBottom: "20px",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  successHeader: {
    textAlign: "center",
    padding: "16px 0 20px",
  },
  successTitle: {
    fontSize: "1.15rem",
    fontWeight: "700",
    color: "var(--color-profit)",
    marginTop: "10px",
  },
  successSubtitle: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    marginTop: "4px",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
  },
  resultCard: {
    background: "var(--bg-surface)",
    border: "1px solid var(--bg-card-border)",
    borderRadius: "10px",
    padding: "14px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  resultLabel: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    fontWeight: "600",
    textAlign: "center",
  },
  disclaimer: {
    marginTop: "14px",
    textAlign: "center",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
};
