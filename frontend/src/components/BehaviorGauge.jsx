import React from "react";

export default function BehaviorGauge({ score = 100 }) {
  const normalizedScore = Math.max(0, Math.min(100, score));

  const getScoreColor = () => {
    if (normalizedScore >= 80) return "#10b981"; // Green - High discipline
    if (normalizedScore >= 60) return "#fbbf24"; // Yellow - Moderate risk
    return "#f43f5e"; // Red - High emotional risk
  };

  const getScoreStatus = () => {
    if (normalizedScore >= 80) return "EXCELLENT DISCIPLINE";
    if (normalizedScore >= 60) return "MODERATE RISK";
    return "HIGH EMOTIONAL TILT";
  };

  // SVG Gauge calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div style={styles.container}>
      <div style={styles.svgWrapper}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          {/* Background Ring */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            stroke="var(--bg-card-border)"
            strokeWidth="10"
            fill="transparent"
          />
          {/* Animated Value Ring */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            stroke={getScoreColor()}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1s ease-in-out",
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
            }}
          />
        </svg>

        {/* Center Text */}
        <div style={styles.textCenter}>
          <span style={{ ...styles.scoreValue, color: getScoreColor() }}>{normalizedScore}</span>
          <span style={styles.scoreMax}>/100</span>
        </div>
      </div>

      <div style={{ ...styles.statusBadge, color: getScoreColor(), background: `${getScoreColor()}15` }}>
        {getScoreStatus()}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px",
  },
  svgWrapper: {
    position: "relative",
    width: "150px",
    height: "150px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  textCenter: {
    position: "absolute",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
  },
  scoreValue: {
    fontSize: "2.4rem",
    fontWeight: "800",
    fontFamily: "var(--font-mono)",
    lineHeight: "1",
  },
  scoreMax: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    fontWeight: "600",
    marginLeft: "2px",
  },
  statusBadge: {
    marginTop: "12px",
    fontSize: "0.75rem",
    fontWeight: "800",
    padding: "4px 12px",
    borderRadius: "6px",
    letterSpacing: "1px",
  },
};
