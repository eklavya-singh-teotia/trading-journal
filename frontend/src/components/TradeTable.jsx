import React from "react";
import { Edit3, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function TradeTable({ trades, onEditJournal, onDeleteTrade }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="card" style={styles.emptyCard}>
        <span style={{ color: "var(--text-muted)" }}>No trades match the current filter selection.</span>
      </div>
    );
  }

  const formatPnl = (pnl) => {
    const val = Number(pnl || 0);
    const formatted = Math.abs(val).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    if (val > 0) return <span style={{ color: "var(--color-profit)", fontWeight: "700" }}>+₹{formatted}</span>;
    if (val < 0) return <span style={{ color: "var(--color-loss)", fontWeight: "700" }}>-₹{formatted}</span>;
    return <span style={{ color: "var(--text-muted)", fontWeight: "700" }}>₹0.00</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thRow}>
            <th style={styles.th}>Date & Time</th>
            <th style={styles.th}>Symbol</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Qty</th>
            <th style={styles.th}>Avg Entry</th>
            <th style={styles.th}>Avg Exit</th>
            <th style={styles.th} title="Gross, excludes brokerage & taxes">
              Gross Realized PnL <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "normal", display: "block" }}>(excludes brokerage)</span>
            </th>
            <th style={styles.th}>Fees</th>
            <th style={styles.th}>R:R</th>
            <th style={styles.th}>Result</th>
            <th style={styles.th}>Journal</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const isLong = trade.direction === "LONG";

            return (
              <tr key={trade._id} style={styles.tr}>
                {/* Date */}
                <td style={styles.td}>
                  <div style={styles.dateText}>{formatDate(trade.entryTime)}</div>
                </td>

                {/* Symbol */}
                <td style={styles.td}>
                  <span style={styles.symbolBadge}>{trade.symbol}</span>
                </td>

                {/* Direction (BUY/SELL - LONG/SHORT) */}
                <td style={styles.td}>
                  <span style={isLong ? styles.longTag : styles.shortTag}>
                    {isLong ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {trade.direction}
                  </span>
                </td>

                {/* Status */}
                <td style={styles.td}>
                  <span className={`badge ${trade.status === "CLOSED" ? "badge-neutral" : trade.status === "PARTIAL" ? "badge-warning" : "badge-profit"}`}>
                    {trade.status}
                  </span>
                </td>

                {/* Total Quantity */}
                <td style={{ ...styles.td, fontFamily: "var(--font-mono)" }}>
                  {trade.totalQuantity}
                </td>

                {/* Avg Entry Price */}
                <td style={{ ...styles.td, fontFamily: "var(--font-mono)" }}>
                  ₹{trade.avgEntryPrice?.toFixed(2)}
                </td>

                {/* Avg Exit Price */}
                <td style={{ ...styles.td, fontFamily: "var(--font-mono)" }}>
                  {trade.avgExitPrice ? `₹${trade.avgExitPrice.toFixed(2)}` : "-"}
                </td>

                {/* Realized PnL */}
                <td style={{ ...styles.td, fontFamily: "var(--font-mono)" }}>
                  {formatPnl(trade.realizedPnl)}
                </td>

                {/* Fees */}
                <td style={{ ...styles.td, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  ₹{(trade.realizedFees ?? trade.totalFees ?? 0).toFixed(2)}
                </td>

                {/* Risk Reward Ratio */}
                <td style={{ ...styles.td, fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                  {trade.rr ? `${trade.rr}:1` : "-"}
                </td>

                {/* Result */}
                <td style={styles.td}>
                  <span className={`badge ${trade.result === "WIN" ? "badge-profit" : trade.result === "LOSS" ? "badge-loss" : "badge-neutral"}`}>
                    {trade.result}
                  </span>
                </td>

                {/* Actions (Edit Journal / Delete) */}
                <td style={styles.td}>
                  <div style={styles.actionGroup}>
                    <button
                      className="btn btn-secondary"
                      style={styles.actionBtn}
                      onClick={() => onEditJournal(trade)}
                      title="Edit Journal & Notes"
                    >
                      <Edit3 size={14} />
                      <span style={{ fontSize: "0.75rem" }}>Journal</span>
                    </button>
                    {onDeleteTrade && (
                      <button
                        className="btn btn-danger"
                        style={{ ...styles.actionBtn, padding: "6px" }}
                        onClick={() => onDeleteTrade(trade._id)}
                        title="Delete Trade"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  tableWrapper: {
    overflowX: "auto",
    background: "var(--bg-card)",
    border: "1px solid var(--bg-card-border)",
    borderRadius: "var(--radius-lg)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    background: "var(--bg-surface)",
    borderBottom: "1px solid var(--bg-card-border)",
  },
  th: {
    padding: "14px 16px",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid var(--bg-card-border)",
    transition: "background 0.15s ease",
  },
  td: {
    padding: "12px 16px",
    fontSize: "0.88rem",
    color: "var(--text-primary)",
    verticalAlign: "middle",
  },
  dateText: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  symbolBadge: {
    fontWeight: "800",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.5px",
  },
  longTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    color: "var(--color-profit)",
    fontWeight: "700",
    fontSize: "0.8rem",
  },
  shortTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    color: "var(--color-loss)",
    fontWeight: "700",
    fontSize: "0.8rem",
  },
  actionGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  actionBtn: {
    padding: "5px 10px",
  },
  emptyCard: {
    padding: "40px",
    textAlign: "center",
  },
};
