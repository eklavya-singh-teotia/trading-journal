import React, { useMemo, useState } from "react";

/**
 * CalendarHeatmap — GitHub-style daily PnL contribution graph.
 * Renders trailing 52 weeks (364 days) of data as colored day cells.
 * Green = profit day, Red = loss day, Neutral = no-trade day.
 */
export default function CalendarHeatmap({ dailyPnlData }) {
  const [tooltip, setTooltip] = useState(null);

  // Build a lookup map: "YYYY-MM-DD" -> { pnl, cumulativePnl }
  const pnlMap = useMemo(() => {
    const map = {};
    (dailyPnlData || []).forEach((d) => {
      map[d.date] = d;
    });
    return map;
  }, [dailyPnlData]);

  // Generate 52 weeks of dates (364 days) ending today
  const weeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from the Sunday 52 weeks ago
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    // Roll back to the previous Sunday
    start.setDate(start.getDate() - start.getDay());

    const allWeeks = [];
    let current = new Date(start);

    while (current <= today) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = formatDate(current);
        const isFuture = current > today;
        week.push({
          date: dateStr,
          dayOfWeek: d,
          isFuture,
          data: pnlMap[dateStr] || null,
        });
        current = new Date(current);
        current.setDate(current.getDate() + 1);
      }
      allWeeks.push(week);
    }
    return allWeeks;
  }, [pnlMap]);

  // Extract month labels for the top axis
  const monthLabels = useMemo(() => {
    const labels = [];
    weeks.forEach((week, weekIdx) => {
      const firstDayOfWeek = week[0];
      if (firstDayOfWeek && !firstDayOfWeek.isFuture) {
        const d = new Date(firstDayOfWeek.date + "T00:00:00");
        if (d.getDate() <= 7) {
          labels.push({
            weekIdx,
            label: d.toLocaleString("en-IN", { month: "short" }),
          });
        }
      }
    });
    return labels;
  }, [weeks]);

  // Color logic
  const getCellColor = (cell) => {
    if (cell.isFuture || !cell.data) return "var(--bg-card-border)";
    const pnl = cell.data.pnl ?? cell.data.dailyPnl ?? 0;
    if (pnl > 0) return "#10b981";
    if (pnl < 0) return "#f43f5e";
    return "var(--bg-card-border)";
  };

  const getCellOpacity = (cell) => {
    if (cell.isFuture || !cell.data) return 1;
    const pnl = Math.abs(cell.data.pnl ?? cell.data.dailyPnl ?? 0);
    if (pnl === 0) return 1;
    // Scale opacity 0.35 → 1.0 based on magnitude (cap at ₹10,000 for max opacity)
    return Math.min(0.35 + (pnl / 10000) * 0.65, 1);
  };

  const CELL = 13;
  const GAP = 3;

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Daily PnL Consistency Heatmap</h3>
          <p style={styles.subtitle}>
            52-week view — green = profit day, red = loss day • Intensity scales with magnitude
          </p>
        </div>
        <div style={styles.legendRow}>
          <span style={styles.legendLabel}>Loss</span>
          {["0.35", "0.55", "0.75", "1"].map((op) => (
            <div
              key={op}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 3,
                background: "#f43f5e",
                opacity: parseFloat(op),
              }}
            />
          ))}
          <div style={{ width: 8 }} />
          {["0.35", "0.55", "0.75", "1"].map((op) => (
            <div
              key={op}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 3,
                background: "#10b981",
                opacity: parseFloat(op),
              }}
            />
          ))}
          <span style={styles.legendLabel}>Profit</span>
        </div>
      </div>

      {/* Chart Area */}
      <div style={{ overflowX: "auto", position: "relative" }}>
        <div style={{ display: "inline-block", paddingTop: "24px" }}>
          {/* Month Labels */}
          <div style={{ display: "flex", position: "absolute", top: 0, left: 0 }}>
            {monthLabels.map(({ weekIdx, label }) => (
              <div
                key={`${weekIdx}-${label}`}
                style={{
                  position: "absolute",
                  left: weekIdx * (CELL + GAP),
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week Columns */}
          <div style={{ display: "flex", gap: GAP, alignItems: "flex-start" }}>
            {/* Day-of-week labels */}
            <div style={{ display: "flex", flexDirection: "column", gap: GAP, marginRight: 4 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: 10,
                    height: CELL,
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i % 2 === 1 ? d : ""}
                </div>
              ))}
            </div>

            {weeks.map((week, wIdx) => (
              <div key={wIdx} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                {week.map((cell, dIdx) => {
                  const pnl = cell.data?.pnl ?? cell.data?.dailyPnl ?? null;
                  return (
                    <div
                      key={dIdx}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 3,
                        background: getCellColor(cell),
                        opacity: getCellOpacity(cell),
                        cursor: cell.data ? "pointer" : "default",
                        transition: "transform 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!cell.data) return;
                        const rect = e.target.getBoundingClientRect();
                        setTooltip({
                          x: rect.left + window.scrollX,
                          y: rect.top + window.scrollY - 52,
                          date: cell.date,
                          pnl,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-card-border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            boxShadow: "var(--shadow-card)",
            zIndex: 200,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>{tooltip.date}</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              color: tooltip.pnl >= 0 ? "#10b981" : "#f43f5e",
            }}
          >
            {tooltip.pnl >= 0 ? "+" : ""}₹{tooltip.pnl?.toLocaleString("en-IN")}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const styles = {
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "12px",
  },
  title: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  subtitle: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  legendLabel: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    fontWeight: 600,
    marginInline: 4,
  },
};
