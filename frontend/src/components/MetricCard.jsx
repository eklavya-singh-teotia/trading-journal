import React, { useState } from "react";

export default function MetricCard({ title, value, subtitle, definition, icon: Icon, type = "neutral" }) {
  const [hovered, setHovered] = useState(false);

  const getCardStyle = () => {
    if (type === "profit") return { borderTop: "3px solid var(--color-profit)" };
    if (type === "loss") return { borderTop: "3px solid var(--color-loss)" };
    if (type === "warning") return { borderTop: "3px solid var(--color-warning)" };
    if (type === "accent") return { borderTop: "3px solid var(--color-accent)" };
    return {};
  };

  const getValueColor = () => {
    if (type === "profit") return "var(--color-profit)";
    if (type === "loss") return "var(--color-loss)";
    if (type === "warning") return "var(--color-warning)";
    if (type === "accent") return "var(--color-accent)";
    return "var(--text-primary)";
  };

  const getIconBg = () => {
    if (type === "profit") return "var(--color-profit-bg)";
    if (type === "loss") return "var(--color-loss-bg)";
    if (type === "warning") return "var(--color-warning-bg)";
    if (type === "accent") return "var(--color-accent-bg)";
    return "var(--bg-surface-hover)";
  };

  const accentColor = getValueColor();

  return (
    <div
      className={`card metric-card${hovered ? " metric-card--hovered" : ""}`}
      style={{ ...styles.card, ...getCardStyle() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        {Icon && (
          <div style={{ ...styles.iconContainer, background: getIconBg() }}>
            <Icon size={18} color={accentColor} stroke={accentColor} />
          </div>
        )}
      </div>

      <div style={{ ...styles.value, color: accentColor }}>{value}</div>

      <div style={styles.footerContainer}>
        {subtitle && (
          <div className={`metric-card-subtitle${hovered && definition ? " metric-card-subtitle--hidden" : ""}`}>
            {subtitle}
          </div>
        )}

        {definition && (
          <p className={`metric-card-definition${hovered ? " metric-card-definition--visible" : ""}`}>
            {definition}
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    position: "relative",
    zIndex: 1,
    transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.25s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  title: {
    fontSize: "0.78rem",
    fontWeight: "700",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.35px",
  },
  iconContainer: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: "1.35rem",
    fontWeight: "800",
    lineHeight: "1.2",
    marginBottom: "4px",
    fontFamily: "var(--font-mono)",
    whiteSpace: "nowrap",
    letterSpacing: "0",
  },
  footerContainer: {
    position: "relative",
    minHeight: "36px",
    display: "flex",
    alignItems: "center",
  },
};
