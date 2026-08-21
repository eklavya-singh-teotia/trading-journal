import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";

const NAV_ORDER = ["/", "/performance", "/behavioral", "/trades", "/accounts"];

const getIndexForPath = (path) => {
  if (path === "/" || path === "/dashboard") return 0;
  const foundIndex = NAV_ORDER.findIndex((p) => p !== "/" && path.startsWith(p));
  return foundIndex !== -1 ? foundIndex : 0;
};

export default function PageTitle({ title, subtitle, extraContent }) {
  const location = useLocation();
  const currentIndex = getIndexForPath(location.pathname);

  // Compute direction once on mount by comparing to sessionStorage.
  // Then immediately persist the current index for the next page.
  const direction = useMemo(() => {
    const savedRaw = sessionStorage.getItem("app_nav_prev_index");
    const prevIndex = savedRaw !== null ? parseInt(savedRaw, 10) : currentIndex;

    // Persist the current index for the next navigation
    sessionStorage.setItem("app_nav_prev_index", currentIndex.toString());

    if (prevIndex === currentIndex) return "none";
    return currentIndex < prevIndex ? "up" : "down";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const shouldAnimate = direction !== "none";

  return (
    <div style={styles.headerContainer}>
      <div style={styles.titleWrapper}>
        <div
          key={location.pathname}
          className={shouldAnimate ? `page-title-roll page-title-roll--${direction}` : undefined}
        >
          <h1 style={styles.pageTitle}>{title}</h1>
        </div>
        {subtitle && <p style={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {extraContent}
    </div>
  );
}

const styles = {
  headerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
  },
  titleWrapper: {
    overflow: "hidden",
    position: "relative",
  },
  pageTitle: {
    fontSize: "1.6rem",
    fontWeight: "800",
    color: "var(--text-primary)",
    lineHeight: "1.25",
    margin: 0,
  },
  pageSubtitle: {
    fontSize: "0.88rem",
    color: "var(--text-muted)",
    marginTop: "4px",
  },
};
