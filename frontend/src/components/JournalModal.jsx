import React, { useState, useEffect } from "react";
import { X, Star, Save, Clock, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
import { api } from "../services/api";

export default function JournalModal({ trade, onClose, onSaveSuccess }) {
  if (!trade) return null;

  const [tradeDetails, setTradeDetails] = useState(trade);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [stopLoss, setStopLoss] = useState(trade.stopLoss || "");
  const [targetPrice, setTargetPrice] = useState(trade.targetPrice || "");
  const [strategy, setStrategy] = useState(trade.strategy || "");
  const [timeframe, setTimeframe] = useState(trade.timeframe || "");
  const [notes, setNotes] = useState(trade.notes || "");
  const [tags, setTags] = useState((trade.tags || []).join(", "));

  // Journal Sub-object
  const [setup, setSetup] = useState(trade.journal?.setup || "");
  const [rating, setRating] = useState(trade.journal?.rating || 0);
  const [lessons, setLessons] = useState(trade.journal?.lessons || "");
  const [emotions, setEmotions] = useState(trade.journal?.emotions || "");

  useEffect(() => {
    // Fetch detailed trade with executions array populated
    const fetchFullTrade = async () => {
      setLoading(true);
      try {
        const fullTrade = await api.get(`/trades/${trade._id}`);
        setTradeDetails(fullTrade);
      } catch (err) {
        console.error("Failed to load trade details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFullTrade();
  }, [trade._id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        stopLoss: stopLoss ? Number(stopLoss) : null,
        targetPrice: targetPrice ? Number(targetPrice) : null,
        strategy,
        timeframe,
        notes,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        journal: {
          setup,
          rating: rating ? Number(rating) : null,
          lessons,
          emotions,
        },
      };

      await api.put(`/trades/${trade._id}/journal`, payload);
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      alert(`Failed to save trade journal: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.tradeTitleRow}>
              <span style={styles.symbolBadge}>{trade.symbol}</span>
              <span className={`badge ${trade.direction === "LONG" ? "badge-profit" : "badge-loss"}`}>
                {trade.direction}
              </span>
              <span className={`badge ${trade.status === "CLOSED" ? "badge-neutral" : "badge-warning"}`}>
                {trade.status}
              </span>
            </div>
            <p style={styles.subtext}>Trade ID: {trade._id}</p>
          </div>

          <button className="btn btn-secondary" style={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Executions Timeline Box */}
        <div style={styles.executionsBox}>
          <div style={styles.boxTitle}>
            <Layers size={16} color="#3b82f6" />
            <span>Execution History ({tradeDetails.executions?.length || 0} fills)</span>
          </div>

          {loading ? (
            <div style={{ color: "#64748b", fontSize: "0.85rem" }}>Loading executions...</div>
          ) : (
            <div style={styles.executionsList}>
              {(tradeDetails.executions || []).map((exec, idx) => (
                <div key={exec._id || idx} style={styles.execItem}>
                  <div style={styles.execSide}>
                    {exec.transactionType === "BUY" ? (
                      <ArrowUpRight size={14} color="#10b981" />
                    ) : (
                      <ArrowDownRight size={14} color="#f43f5e" />
                    )}
                    <span style={{ fontWeight: "700", color: exec.transactionType === "BUY" ? "#10b981" : "#f43f5e" }}>
                      {exec.transactionType}
                    </span>
                  </div>
                  <span style={styles.execDetail}>{exec.quantity} shares @ ₹{exec.price?.toFixed(2)}</span>
                  <span style={styles.execTime}>
                    {new Date(exec.executionTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Journaling Form */}
        <form onSubmit={handleSave}>
          <div style={styles.grid2}>
            <div className="form-group">
              <label className="form-label">Stop Loss (₹)</label>
              <input
                type="number"
                step="0.05"
                className="form-input"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="e.g. 2420.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Price (₹)</label>
              <input
                type="number"
                step="0.05"
                className="form-input"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 2500.00"
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div className="form-group">
              <label className="form-label">Strategy / Setup Name</label>
              <input
                type="text"
                className="form-input"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="e.g. Opening Range Breakout"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Timeframe</label>
              <select
                className="form-select"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="">Select timeframe...</option>
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="Daily">Daily</option>
              </select>
            </div>
          </div>

          {/* 5-Star Rating */}
          <div className="form-group">
            <label className="form-label">Execution Quality Rating</label>
            <div style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  style={styles.starBtn}
                >
                  <Star
                    size={22}
                    color={star <= rating ? "#fbbf24" : "#64748b"}
                    fill={star <= rating ? "#fbbf24" : "transparent"}
                  />
                </button>
              ))}
              <span style={{ fontSize: "0.85rem", color: "#94a3b8", marginLeft: "8px" }}>
                {rating > 0 ? `${rating} / 5 Stars` : "Not rated"}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Emotional State / Mindset</label>
            <input
              type="text"
              className="form-input"
              value={emotions}
              onChange={(e) => setEmotions(e.target.value)}
              placeholder="e.g. Calm, Patient, Impulsive, Hesitant"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Lessons Learned & Reflection</label>
            <textarea
              rows="3"
              className="form-textarea"
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              placeholder="What went well? What mistake should be avoided next time?"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input
              type="text"
              className="form-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. breakout, nifty, scalp, revenge"
            />
          </div>

          {/* Footer Actions */}
          <div style={styles.footer}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              <span>{saving ? "Saving..." : "Save Journal Entry"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  modal: {
    maxWidth: "680px",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "1px solid #253350",
  },
  tradeTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "4px",
  },
  symbolBadge: {
    fontSize: "1.2rem",
    fontWeight: "800",
    color: "#f1f5f9",
    fontFamily: "var(--font-mono)",
  },
  subtext: {
    fontSize: "0.78rem",
    color: "#64748b",
  },
  closeBtn: {
    padding: "6px",
  },
  executionsBox: {
    background: "#131b2e",
    border: "1px solid #253350",
    borderRadius: "10px",
    padding: "12px 16px",
    marginBottom: "20px",
  },
  boxTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.82rem",
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: "10px",
  },
  executionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxHeight: "120px",
    overflowY: "auto",
  },
  execItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "0.8rem",
    padding: "4px 8px",
    background: "#182238",
    borderRadius: "6px",
  },
  execSide: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  execDetail: {
    fontFamily: "var(--font-mono)",
    color: "#cbd5e1",
  },
  execTime: {
    color: "#64748b",
    fontSize: "0.75rem",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  starRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  starBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "2px",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid #253350",
  },
};
