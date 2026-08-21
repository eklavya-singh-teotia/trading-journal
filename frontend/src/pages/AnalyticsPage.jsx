import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import BreakdownChart from "../components/BreakdownChart";
import AICoachWidget from "../components/AICoachWidget";
import PageTitle from "../components/PageTitle";
import { Brain, BarChart3 } from "lucide-react";

export default function AnalyticsPage({ tab }) {
  const { selectedAccount, dateRange } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(tab || "all");
  const [breakdown, setBreakdown] = useState(null);
  const [behavior, setBehavior] = useState(null);
  const [loading, setLoading] = useState(true);
  const [behaviorLoading, setBehaviorLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState("");

  const isMountedRef = useRef(true);

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedAccount, dateRange]);

  const getQueryString = () => {
    const queryParams = new URLSearchParams();
    if (selectedAccount) queryParams.append("accountId", selectedAccount);
    if (dateRange.startDate) queryParams.append("startDate", dateRange.startDate);
    if (dateRange.endDate) queryParams.append("endDate", dateRange.endDate);
    return queryParams.toString() ? `?${queryParams.toString()}` : "";
  };

  const fetchData = async () => {
    setLoading(true);
    setBehaviorLoading(true);
    setAiError("");
    try {
      const queryString = getQueryString();

      // Fetch breakdown & fast behavioral metrics (<50ms, 0 Gemini API calls)
      const [breakdownRes, behaviorRes] = await Promise.all([
        api.get(`/analytics/breakdown${queryString}`),
        api.get(`/analytics/behavior${queryString}`),
      ]);

      if (isMountedRef.current) {
        setBreakdown(breakdownRes);
        setBehavior(behaviorRes);
      }
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setBehaviorLoading(false);
      }
    }
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    setAiError("");
    try {
      const queryString = getQueryString();
      const newBehaviorRes = await api.post(`/analytics/behavior/generate${queryString}`);
      if (isMountedRef.current) {
        setBehavior(newBehaviorRes);
      }
    } catch (err) {
      console.error("Error generating AI insights:", err);
      const message = err.message || "Gemini AI insights could not be generated. Please check your Gemini API key and try again.";
      if (isMountedRef.current) {
        setAiError(message);
        showToast(message, "error");
      }
    } finally {
      if (isMountedRef.current) {
        setGeneratingAI(false);
      }
    }
  };

  const titleText =
    activeTab === "performance"
      ? "Performance Analysis"
      : activeTab === "behavioral"
      ? "Behavioral Analysis"
      : "Analytics & AI Coach";

  return (
    <div>
      {/* Page Header */}
      <PageTitle title={titleText} />

      {/* ══════════════════════════════════════
          SECTION A: BEHAVIORAL ANALYTICS
          ══════════════════════════════════════ */}
      {(activeTab === "all" || activeTab === "behavioral") && (
        <>
          <div style={styles.sectionDivider}>
            <div style={{ ...styles.sectionBadge, borderColor: "#8b5cf6", color: "#8b5cf6", background: "rgba(139,92,246,0.1)" }}>
              <Brain size={14} />
              <span>Behavioral Analytics</span>
            </div>
            <div style={styles.dividerLine} />
          </div>

          <AICoachWidget
            behaviorData={behavior}
            loading={behaviorLoading}
            generatingAI={generatingAI}
            aiError={aiError}
            onGenerateAI={handleGenerateAI}
          />
        </>
      )}

      {/* ══════════════════════════════════════
          SECTION B: PERFORMANCE ANALYTICS
          ══════════════════════════════════════ */}
      {(activeTab === "all" || activeTab === "performance") && (
        <>
          <div style={{ ...styles.sectionDivider, marginTop: "8px" }}>
            <div style={{ ...styles.sectionBadge, borderColor: "var(--color-accent)", color: "var(--color-accent)", background: "var(--color-accent-bg)" }}>
              <BarChart3 size={14} />
              <span>Performance Analytics</span>
            </div>
            <div style={styles.dividerLine} />
          </div>
          <p style={styles.sectionCaption}>
            Deep dive breakdowns across symbols, market hours, days of the week, and strategies • Gross P&amp;L (excludes brokerage)
          </p>

          {/* Row 1: Symbol Performance & Time-of-Day */}
          <div className="grid-equal">
            <BreakdownChart
              title="Profit / Loss by Symbol"
              subtitle="Gross realized PnL performance (excludes brokerage) grouped by stock or instrument"
              items={breakdown?.bySymbol || []}
              labelKey="symbol"
              valueKey="pnl"
            />

            <BreakdownChart
              title="IST Market Hours Distribution"
              subtitle="Gross PnL performance (excludes brokerage) across Indian stock market trading sessions"
              items={breakdown?.byTimeOfDay || []}
              labelKey="window"
              valueKey="pnl"
            />
          </div>

          {/* Row 2: Day of Week & Strategy */}
          <div className="grid-equal">
            <BreakdownChart
              title="Day of the Week Performance"
              subtitle="Gross PnL performance (excludes brokerage) from Monday to Friday"
              items={breakdown?.byDayOfWeek || []}
              labelKey="day"
              valueKey="pnl"
            />

            <BreakdownChart
              title="Strategy / Setup Performance"
              subtitle="Gross PnL performance (excludes brokerage) grouped by user-labeled trading strategy"
              items={breakdown?.byStrategy || []}
              labelKey="strategy"
              valueKey="pnl"
            />
          </div>

          {/* Breakdown Details Data Table */}
          <div className="card">
            <h3 style={styles.tableTitle}>Symbol Breakdown Matrix</h3>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-card-border)" }}>
                    <th style={styles.th}>Symbol</th>
                    <th style={styles.th}>Trades</th>
                    <th style={styles.th}>Win Rate %</th>
                    <th style={styles.th}>Total Shares/Qty</th>
                    <th style={styles.th} title="Gross, excludes brokerage & taxes">Gross Realized PnL (excludes brokerage)</th>
                  </tr>
                </thead>
                <tbody>
                  {(breakdown?.bySymbol || []).map((item) => (
                    <tr key={item.symbol} style={{ borderBottom: "1px solid var(--bg-card-border)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: "800", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                        {item.symbol}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{item.tradesCount}</td>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: item.winRate >= 50 ? "var(--color-profit)" : "var(--color-loss)" }}>
                        {item.winRate}%
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                        {item.totalQuantity}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: "800", fontFamily: "var(--font-mono)", color: item.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)" }}>
                        {item.pnl >= 0 ? "+" : ""}₹{item.pnl.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  pageHeader: {
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  pageTitle: {
    fontSize: "1.6rem",
    fontWeight: "800",
    color: "var(--text-primary)",
  },
  pageSubtitle: {
    fontSize: "0.88rem",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  sectionDivider: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "8px",
  },
  sectionBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "5px 14px",
    borderRadius: "20px",
    fontSize: "0.78rem",
    fontWeight: "800",
    border: "1px solid",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "var(--bg-card-border)",
  },
  sectionCaption: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    marginBottom: "20px",
  },
  tableTitle: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    marginBottom: "16px",
  },
  th: {
    padding: "12px 16px",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
};
