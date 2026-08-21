import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useChartTheme } from "../context/ThemeContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function EquityCurveChart({ dailyPnlData }) {
  const chartTheme = useChartTheme();
  const textColor = chartTheme.textPrimary;
  const textSecondary = chartTheme.textSecondary;
  const gridColor = chartTheme.gridColor;
  const axisColor = chartTheme.axisColor;

  if (!dailyPnlData || dailyPnlData.length === 0) {
    return (
      <div className="card" style={styles.emptyCard}>
        <span style={{ color: textColor }}>No closed trades data available for Equity Curve.</span>
      </div>
    );
  }

  const labels = dailyPnlData.map((d) => d.date);
  const cumulativeData = dailyPnlData.map((d) => d.cumulativePnl);

  const lastValue = cumulativeData[cumulativeData.length - 1] || 0;
  const isPositive = lastValue >= 0;

  const strokeColor = isPositive ? "#10b981" : "#f43f5e";
  const fillColor = isPositive ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)";

  const data = {
    labels,
    datasets: [
      {
        label: "Cumulative PnL (₹)",
        data: cumulativeData,
        borderColor: strokeColor,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: strokeColor,
        pointBorderColor: "var(--bg-card)",
        pointHoverRadius: 6,
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        borderWidth: 1,
        titleColor: textColor,
        bodyColor: strokeColor,
        bodyFont: { family: "JetBrains Mono", weight: "bold" },
        padding: 12,
        callbacks: {
          label: (context) => ` Cumulative Gross PnL: ₹${context.parsed.y.toLocaleString("en-IN")} (excludes brokerage)`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        border: { color: axisColor, width: 1 },
        ticks: { color: textSecondary, font: { family: "Plus Jakarta Sans", size: 10 } },
        title: {
          display: true,
          text: "Timeline / Trading Dates",
          color: textSecondary,
          font: { family: "Plus Jakarta Sans", size: 10, weight: "bold" },
        },
      },
      y: {
        grid: { color: gridColor },
        border: { color: axisColor, width: 1 },
        ticks: {
          color: textSecondary,
          font: { family: "JetBrains Mono", size: 10 },
          callback: (value) => `₹${value.toLocaleString("en-IN")}`,
        },
        title: {
          display: true,
          text: "Cumulative PnL (₹)",
          color: textSecondary,
          font: { family: "Plus Jakarta Sans", size: 10, weight: "bold" },
        },
      },
    },
  };

  return (
    <div className="card" style={{ height: "380px", marginBottom: "24px" }}>
      <div style={styles.header}>
        <div>
          <h3 style={{ ...styles.title, color: textColor }}>Cumulative Gross Equity Curve</h3>
          <p style={{ ...styles.subtitle, color: textColor }}>Daily aggregate gross realized PnL growth over time (excludes brokerage &amp; taxes)</p>
        </div>
        <div style={{ ...styles.badge, color: strokeColor, background: fillColor }} title="Gross, excludes brokerage & taxes">
          {isPositive ? "+" : ""}₹{lastValue.toLocaleString("en-IN")}
        </div>
      </div>
      <div style={{ height: "290px", width: "100%" }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  title: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  subtitle: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
  badge: {
    fontSize: "0.9rem",
    fontWeight: "800",
    padding: "4px 12px",
    borderRadius: "8px",
    fontFamily: "var(--font-mono)",
  },
  emptyCard: {
    height: "380px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "24px",
  },
};
