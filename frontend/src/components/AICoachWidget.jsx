import React from "react";
import { Brain, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw } from "lucide-react";
import BehaviorGauge from "./BehaviorGauge";

export default function AICoachWidget({ behaviorData, loading, generatingAI, aiError, onGenerateAI }) {
  if (loading) {
    return (
      <div className="card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <div style={styles.sparkleIcon}>
              <Sparkles size={18} color="var(--color-accent)" className="spin" />
            </div>
            <div>
              <h3 style={styles.title}>AI Psychology Coach &amp; Behavioral Discipline</h3>
              <span style={styles.sourceTag}>Loading Behavioral Metrics...</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
          <Brain size={32} className="spin" color="var(--color-accent)" style={{ marginBottom: "12px" }} />
          <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
            Loading Behavioral Metrics...
          </p>
        </div>
      </div>
    );
  }

  if (!behaviorData || (behaviorData.metrics?.totalTrades || 0) === 0) {
    return (
      <div className="card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <div style={styles.sparkleIcon}>
              <Brain size={18} color="var(--color-accent)" />
            </div>
            <div>
              <h3 style={styles.title}>AI Psychology Coach &amp; Behavioral Discipline</h3>
              <span style={styles.sourceTag}>No behavioral data yet</span>
            </div>
          </div>
        </div>

        <div style={styles.emptyState}>
          <Brain size={32} color="var(--text-muted)" style={{ marginBottom: "10px" }} />
          <h4 style={styles.emptyTitle}>No trades to analyze</h4>
          <p style={styles.emptyText}>
            Behavioral metrics will appear after this account has imported or recorded trades.
          </p>
        </div>
      </div>
    );
  }

  const { metrics, aiInsights, source, isStale, generatedAt } = behaviorData;
  const score = metrics?.behaviorScore ?? 100;
  const hasSavedAI = Boolean(aiInsights);

  return (
    <div className="card" style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <div style={styles.sparkleIcon}>
            <Sparkles size={18} color="var(--color-accent)" />
          </div>
          <div>
            <h3 style={styles.title}>AI Psychology Coach &amp; Behavioral Discipline</h3>
            <span style={styles.sourceTag}>
              {source?.includes("GEMINI") ? `Powered by Gemini` : "Algorithmic Rule Engine"}
            </span>
          </div>
        </div>

        {/* On-Demand AI Trigger Button */}
        {onGenerateAI && (
          <button
            className="btn btn-primary"
            onClick={onGenerateAI}
            disabled={generatingAI}
            style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}
          >
            <Sparkles size={15} className={generatingAI ? "spin" : ""} />
            <span>{generatingAI ? "Generating AI Insights..." : hasSavedAI ? "Regenerate AI Insights" : "Generate AI Insights"}</span>
          </button>
        )}
      </div>

      {/* Stale Data Alert Banner */}
      {isStale && (
        <div style={styles.staleBanner}>
          <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>
            New trade data detected for this date range. Click <strong>Regenerate AI Insights</strong> to update your AI analysis.
          </span>
        </div>
      )}

      {aiError && (
        <div style={styles.errorBanner}>
          <AlertTriangle size={16} color="#f43f5e" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.82rem", color: "var(--text-primary)", lineHeight: "1.45" }}>
            {aiError}
          </span>
        </div>
      )}

      {/* Main Behavioral Metrics Grid */}
      <div style={styles.bodyGrid}>
        {/* Left: Behavior Score Gauge */}
        <div style={styles.gaugeCol}>
          <BehaviorGauge score={score} />

          {/* Quick Metrics Badges */}
          <div style={styles.metricsList}>
            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>Revenge Trades</span>
              <span style={{ ...styles.metricVal, color: metrics?.revengeTrades?.count > 0 ? "#f43f5e" : "#10b981" }}>
                {metrics?.revengeTrades?.count || 0} ({metrics?.revengeTrades?.rate || 0}%)
              </span>
            </div>

            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>Averaging Down</span>
              <span style={{ ...styles.metricVal, color: metrics?.averagingDown?.count > 0 ? "#fbbf24" : "#10b981" }}>
                {metrics?.averagingDown?.count || 0} trades
              </span>
            </div>

            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>Holding Pattern</span>
              <span style={{ ...styles.metricVal, color: metrics?.holdingPattern?.flag === "HOLDING_LOSERS_TOO_LONG" ? "#f43f5e" : "#10b981" }}>
                {metrics?.holdingPattern?.avgWinMinutes}m Win / {metrics?.holdingPattern?.avgLossMinutes}m Loss
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: AI Insights Subsection */}
        <div style={styles.contentCol}>
          {generatingAI ? (
            <div style={styles.aiLoadingBox}>
              <Brain size={28} className="spin" color="var(--color-accent)" style={{ marginBottom: "10px" }} />
              <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)" }}>
                We are analyzing your trading psychology...
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Evaluating revenge trades, holding patterns, and building mandatory discipline rules
              </p>
            </div>
          ) : hasSavedAI ? (
            <>
              {/* AI Insights Subsection Header */}
              <div style={styles.aiSubheader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={16} color="var(--color-accent)" />
                  <h4 style={styles.aiSubheaderTitle}>AI Insights &amp; Psychological Analysis</h4>
                </div>
                {generatedAt && (
                  <span style={styles.timestampText}>
                    Generated {new Date(generatedAt).toLocaleDateString()} at {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Psychological Summary */}
              {aiInsights.psychologicalSummary && (
                <div style={styles.summaryBox}>
                  <p style={styles.summaryText}>"{aiInsights.psychologicalSummary}"</p>
                </div>
              )}

              <div style={styles.twoColInsights}>
                {/* Strengths */}
                {aiInsights.strengths?.length > 0 && (
                  <div style={styles.section}>
                    <h4 style={{ ...styles.sectionHeader, color: "#10b981" }}>
                      <CheckCircle2 size={16} /> Key Strengths
                    </h4>
                    <ul style={styles.list}>
                      {aiInsights.strengths.map((str, idx) => (
                        <li key={idx} style={styles.listItem}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Vulnerabilities / Psychological Leaks */}
                {aiInsights.vulnerabilities?.length > 0 && (
                  <div style={styles.section}>
                    <h4 style={{ ...styles.sectionHeader, color: "#f43f5e" }}>
                      <AlertTriangle size={16} /> Psychological Leaks
                    </h4>
                    <ul style={styles.list}>
                      {aiInsights.vulnerabilities.map((vuln, idx) => (
                        <li key={idx} style={styles.listItem}>{vuln}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Mandatory Actionable Rules */}
              {aiInsights.actionableRules?.length > 0 && (
                <div style={styles.rulesSection}>
                  <h4 style={{ ...styles.sectionHeader, color: "var(--color-accent)" }}>
                    <ShieldAlert size={16} /> Mandatory Discipline Rules
                  </h4>
                  <div style={styles.rulesGrid}>
                    {aiInsights.actionableRules.map((rule, idx) => (
                      <div key={idx} style={styles.ruleCard}>
                        <span style={styles.ruleNum}>{idx + 1}</span>
                        <span style={styles.ruleText}>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Prompt Banner when no AI insights generated yet */
            <div style={styles.noAiBanner}>
              <Brain size={32} color="var(--color-accent)" style={{ marginBottom: "10px" }} />
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                Generate On-Demand AI Behavioral Insights
              </h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto 16px auto", lineHeight: "1.5" }}>
                Click the <strong>Generate AI Insights</strong> button to trigger AI to analyze your trade duration ratio, revenge trade PnL impact, and generate custom discipline rules.
              </p>
              {onGenerateAI && (
                <button className="btn btn-primary" onClick={onGenerateAI} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={15} />
                  <span>Generate AI Insights</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    marginBottom: "24px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "1px solid var(--bg-card-border)",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  sparkleIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "var(--color-accent-bg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  sourceTag: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    fontWeight: "600",
  },
  bodyGrid: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: "24px",
  },
  gaugeCol: {
    borderRight: "1px solid var(--bg-card-border)",
    paddingRight: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  metricsList: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "16px",
  },
  metricItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "0.78rem",
  },
  metricLabel: {
    color: "var(--text-secondary)",
    fontWeight: "500",
  },
  metricVal: {
    fontWeight: "700",
    fontFamily: "var(--font-mono)",
  },
  contentCol: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  summaryBox: {
    background: "var(--bg-surface)",
    borderLeft: "4px solid var(--color-accent)",
    padding: "12px 16px",
    borderRadius: "0 8px 8px 0",
  },
  summaryText: {
    fontSize: "0.9rem",
    fontStyle: "italic",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
  },
  twoColInsights: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  section: {
    background: "var(--bg-surface)",
    borderRadius: "10px",
    padding: "14px 16px",
    border: "1px solid var(--bg-card-border)",
  },
  sectionHeader: {
    fontSize: "0.85rem",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  listItem: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4",
  },
  rulesSection: {
    marginTop: "4px",
  },
  rulesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "10px",
    marginTop: "8px",
  },
  ruleCard: {
    background: "var(--bg-surface)",
    border: "1px solid var(--bg-card-border)",
    borderRadius: "8px",
    padding: "10px 14px",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  ruleNum: {
    background: "var(--color-accent-bg)",
    color: "var(--color-accent)",
    fontWeight: "800",
    fontSize: "0.75rem",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ruleText: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4",
  },
  staleBanner: {
    background: "rgba(251, 191, 36, 0.1)",
    border: "1px solid rgba(251, 191, 36, 0.3)",
    borderRadius: "8px",
    padding: "10px 16px",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  errorBanner: {
    background: "rgba(244, 63, 94, 0.1)",
    border: "1px solid rgba(244, 63, 94, 0.3)",
    borderRadius: "8px",
    padding: "10px 16px",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  aiSubheader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "10px",
    borderBottom: "1px solid var(--bg-card-border)",
    marginBottom: "8px",
  },
  aiSubheaderTitle: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  timestampText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  aiLoadingBox: {
    background: "var(--bg-surface)",
    border: "1px dashed var(--color-accent)",
    borderRadius: "10px",
    padding: "32px 20px",
    textAlign: "center",
  },
  emptyState: {
    padding: "34px 20px",
    textAlign: "center",
    color: "var(--text-secondary)",
  },
  emptyTitle: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    marginBottom: "4px",
  },
  emptyText: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
  },
  noAiBanner: {
    background: "var(--bg-surface)",
    border: "1px dashed var(--bg-card-border)",
    borderRadius: "10px",
    padding: "28px 20px",
    textAlign: "center",
  },
};
