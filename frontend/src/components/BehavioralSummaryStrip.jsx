import React from "react";
import { Link } from "react-router-dom";
import { Brain, ArrowRight, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * BehavioralSummaryStrip — compact behavioral health banner on the Dashboard.
 * Shows the behavior score, a 1-line AI summary, and key flags.
 * Links to the full Analytics page for the complete AI Coach.
 */
export default function BehavioralSummaryStrip({ behaviorData }) {
  if (!behaviorData) return null;

  const { metrics, aiInsights } = behaviorData;
  if (!metrics || (metrics.totalTrades || 0) === 0) return null;

  const score = metrics?.behaviorScore ?? 100;

  const getScoreColor = () => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#fbbf24";
    return "#f43f5e";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Excellent Discipline";
    if (score >= 60) return "Moderate Risk";
    return "High Emotional Tilt";
  };

  const scoreColor = getScoreColor();
  const hasRevenge = (metrics?.revengeTrades?.count || 0) > 0;
  const hasAveraging = (metrics?.averagingDown?.count || 0) > 0;
  const summary = aiInsights?.psychologicalSummary;

  return (
    <div
      className="card"
      style={{
        marginBottom: "24px",
        borderLeft: `4px solid ${scoreColor}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        padding: "16px 24px",
        flexWrap: "wrap",
      }}
    >
      {/* Left: Icon + Score */}
      <div style={styles.leftSection}>
        <div
          style={{
            ...styles.scoreCircle,
            border: `3px solid ${scoreColor}`,
            color: scoreColor,
          }}
        >
          <span style={styles.scoreNum}>{score}</span>
        </div>
        <div>
          <div style={styles.scoreLabel}>
            <Brain size={14} style={{ flexShrink: 0 }} />
            <span>Behavioral Score</span>
          </div>
          <div style={{ ...styles.statusText, color: scoreColor }}>
            {getScoreLabel()}
          </div>
        </div>
      </div>

      {/* Center: AI Summary Snippet */}
      {summary && (
        <div style={styles.summarySection}>
          <p style={styles.summaryText}>
            "{summary.length > 110 ? summary.slice(0, 110) + "…" : summary}"
          </p>
        </div>
      )}

      {/* Right: Flag Pills + CTA */}
      <div style={styles.rightSection}>
        <div style={styles.flags}>
          {hasRevenge ? (
            <div style={{ ...styles.flag, color: "#f43f5e", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}>
              <AlertTriangle size={12} />
              <span>Revenge Trades: {metrics.revengeTrades.count}</span>
            </div>
          ) : (
            <div style={{ ...styles.flag, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <CheckCircle2 size={12} />
              <span>No Revenge Trades</span>
            </div>
          )}
          {hasAveraging && (
            <div style={{ ...styles.flag, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <TrendingUp size={12} />
              <span>Averaging Down: {metrics.averagingDown.count}</span>
            </div>
          )}
        </div>

        <Link to="/analytics" style={styles.ctaLink}>
          <span>Full AI Coach</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

const styles = {
  leftSection: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexShrink: 0,
  },
  scoreCircle: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scoreNum: {
    fontSize: "1.2rem",
    fontWeight: "800",
    fontFamily: "var(--font-mono)",
  },
  scoreLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statusText: {
    fontSize: "0.9rem",
    fontWeight: "800",
    marginTop: "2px",
  },
  summarySection: {
    flex: 1,
    minWidth: "200px",
    padding: "0 16px",
    borderLeft: "1px solid var(--bg-card-border)",
    borderRight: "1px solid var(--bg-card-border)",
  },
  summaryText: {
    fontSize: "0.85rem",
    fontStyle: "italic",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
  },
  rightSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "10px",
    flexShrink: 0,
  },
  flags: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  flag: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "0.72rem",
    fontWeight: "700",
  },
  ctaLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    borderRadius: "8px",
    fontSize: "0.82rem",
    fontWeight: "700",
    color: "var(--color-accent)",
    background: "var(--color-accent-bg)",
    textDecoration: "none",
    transition: "all 0.2s ease",
  },
};
