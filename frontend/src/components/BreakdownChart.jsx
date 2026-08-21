import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useChartTheme } from "../context/ThemeContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function BreakdownChart({ title, subtitle, items, labelKey, valueKey = "pnl" }) {
  const chartTheme = useChartTheme();

  if (!items || items.length === 0) {
    return (
      <div className="card" style={{ height: "390px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-muted)" }}>No breakdown data available.</span>
      </div>
    );
  }

  const labels = items.map((item) => item[labelKey] || "Other");
  const values = items.map((item) => item[valueKey] || 0);

  const backgroundColors = values.map((v) => (v >= 0 ? chartTheme.profitColor : chartTheme.lossColor));
  const borderColors = backgroundColors;

  const data = {
    labels,
    datasets: [
      {
        label: "PnL (₹)",
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 12,
        top: 6,
        left: 6,
        right: 6,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        borderWidth: 1,
        titleColor: chartTheme.textPrimary,
        bodyColor: chartTheme.profitColor,
        callbacks: {
          label: (context) => ` Gross PnL: ₹${context.parsed.y.toLocaleString("en-IN")} (excludes brokerage)`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: chartTheme.gridColor },
        border: { color: chartTheme.axisColor },
        ticks: {
          color: chartTheme.textSecondary,
          font: { family: "Plus Jakarta Sans", size: 10 },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        grid: { color: chartTheme.gridColor },
        border: { color: chartTheme.axisColor },
        ticks: {
          color: chartTheme.textSecondary,
          font: { family: "JetBrains Mono", size: 10 },
          callback: (v) => `₹${v.toLocaleString("en-IN")}`,
        },
      },
    },
  };

  return (
    <div className="card" style={{ height: "390px", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "12px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)" }}>{title}</h3>
        {subtitle && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.3 }}>{subtitle}</p>}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <Bar key={chartTheme.theme} data={data} options={options} />
      </div>
    </div>
  );
}
