import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import MetricCard from "../components/MetricCard";
import EquityCurveChart from "../components/EquityCurveChart";
import CalendarHeatmap from "../components/CalendarHeatmap";
import BehavioralSummaryStrip from "../components/BehavioralSummaryStrip";
import TradeTable from "../components/TradeTable";
import JournalModal from "../components/JournalModal";
import PageTitle from "../components/PageTitle";
import {
  DollarSign,
  Percent,
  TrendingUp,
  ShieldAlert,
  Receipt,
  Award,
  RefreshCw
} from "lucide-react";

export default function DashboardPage() {
  const { selectedAccount, dateRange, fetchAccounts } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [dailyPnl, setDailyPnl] = useState([]);
  const [behavior, setBehavior] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTrade, setEditingTrade] = useState(null);

  // Guard against processing the same OAuth redirect more than once
  const oauthHandledRef = useRef(false);

  // Handle Upstox OAuth callback redirect params
  useEffect(() => {
    const broker = searchParams.get("broker");
    const status = searchParams.get("status");

    if (!broker || !status) return;
    if (oauthHandledRef.current) return;
    oauthHandledRef.current = true;

    // Clean up query params immediately — replace so Back button isn't affected
    navigate("/dashboard", { replace: true });

    if (broker === "upstox") {
      if (status === "success") {
        showToast("Upstox account connected successfully! Refreshing data...", "success");
        fetchAccounts();
      } else if (status === "error") {
        const message = searchParams.get("message") || "Failed to connect Upstox account.";
        showToast(message, "error");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedAccount, dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedAccount) queryParams.append("accountId", selectedAccount);
      if (dateRange.startDate) queryParams.append("startDate", dateRange.startDate);
      if (dateRange.endDate) queryParams.append("endDate", dateRange.endDate);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      // Fetch algorithmic dashboard data (purely rule-based engine metrics, 0 Gemini API calls)
      const [summaryRes, dailyRes, behaviorRes, tradesRes] = await Promise.all([
        api.get(`/analytics/summary${queryString}`),
        api.get(`/analytics/daily-pnl${queryString}`),
        api.get(`/analytics/rule-behavior${queryString}`),
        api.get(`/trades${queryString ? queryString + "&limit=5" : "?limit=5"}`),
      ]);

      setSummary(summaryRes);
      setDailyPnl(dailyRes);
      setBehavior(behaviorRes);
      setRecentTrades(tradesRes.trades || []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const netPnl = summary?.netPnl || 0;
  const isNetProfit = netPnl >= 0;

  return (
    <div>
      {/* Header Refresh Bar */}
      <PageTitle
        title="Executive Trading Dashboard"
        subtitle="Overview of quantitative edge, consistency heatmap, equity curve, and behavioral health"
        extraContent={
          <button className="btn btn-secondary" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            <span>Refresh Data</span>
          </button>
        }
      />

      {/* Row 1: KPI Metric Cards */}
      <div className="grid-metrics">
        <MetricCard
          title="Gross Realized PnL"
          value={`${isNetProfit ? "+" : ""}₹${netPnl.toLocaleString("en-IN")}`}
          subtitle={`Gross Profit: ₹${(summary?.grossProfit || 0).toLocaleString("en-IN")} | Gross Loss: ₹${(summary?.grossLoss || 0).toLocaleString("en-IN")} • Gross, excludes brokerage & taxes`}
          definition="Net gross profit from all closed trades before brokerage and taxes."
          icon={DollarSign}
          type={isNetProfit ? "profit" : "loss"}
        />

        <MetricCard
          title="Win Rate %"
          value={`${summary?.winRate || 0}%`}
          subtitle={`${summary?.winningTrades || 0} Wins / ${summary?.losingTrades || 0} Losses (${summary?.closedTrades || 0} Closed)`}
          definition="Share of closed trades that ended with a positive gross PnL."
          icon={Percent}
          type={summary?.winRate >= 50 ? "profit" : "warning"}
        />

        <MetricCard
          title="Profit Factor"
          value={summary?.profitFactor || 0}
          subtitle={`Win/Loss Ratio: ${summary?.winLossRatio || 0} | Expectancy: ₹${summary?.expectancy || 0}`}
          definition="Gross profits divided by gross losses — above 1.0 means you're net profitable."
          icon={Award}
          type={summary?.profitFactor >= 1.2 ? "profit" : "loss"}
        />

        <MetricCard
          title="Max Drawdown"
          value={`₹${(summary?.maxDrawdown || 0).toLocaleString("en-IN")}`}
          subtitle={`Max Drawdown: ${summary?.maxDrawdownPercent || 0}% from peak`}
          definition="Largest peak-to-trough drop in your cumulative equity curve."
          icon={ShieldAlert}
          type={summary?.maxDrawdown > 0 ? "loss" : "neutral"}
        />

        <MetricCard
          title="Total Brokerage Fees"
          value={`₹${(summary?.totalFees || 0).toLocaleString("en-IN")}`}
          subtitle={`Avg Winner Duration: ${summary?.avgWinnerHoldingPeriod || 0}m`}
          definition="Total brokerage and exchange fees paid across all trades in this period."
          icon={Receipt}
          type="accent"
        />
      </div>

      {/* Row 2: Calendar Heatmap */}
      <CalendarHeatmap dailyPnlData={dailyPnl} />

      {/* Row 3: Behavioral Summary Strip */}
      <BehavioralSummaryStrip behaviorData={behavior} />

      {/* Row 4: Equity Curve Line + Daily Bar Chart */}
      <EquityCurveChart dailyPnlData={dailyPnl} />

      {/* Row 5: Recent Trades Snapshot */}
      <div className="card">
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>Recent Executed Trades</h3>
            <p style={styles.sectionSubtitle}>Last 5 matched FIFO trades</p>
          </div>
        </div>

        <TradeTable
          trades={recentTrades}
          onEditJournal={(trade) => setEditingTrade(trade)}
        />
      </div>

      {/* Edit Journal Slide-Over Modal */}
      {editingTrade && (
        <JournalModal
          trade={editingTrade}
          onClose={() => setEditingTrade(null)}
          onSaveSuccess={fetchDashboardData}
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
    marginTop: "2px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  sectionSubtitle: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
};
