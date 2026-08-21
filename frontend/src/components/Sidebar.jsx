import React, { useRef, useState, useLayoutEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Brain,
  BookOpen,
  Building2,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const navRef = useRef(null);
  const itemRefs = useRef([]);
  const [indicatorOffset, setIndicatorOffset] = useState(0);
  const [indicatorHeight, setIndicatorHeight] = useState(44);

  const isNavActive = (path) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Performance Analysis", path: "/performance", icon: BarChart3 },
    { label: "Behavioral Analysis", path: "/behavioral", icon: Brain },
    { label: "Trade Logs", path: "/trades", icon: BookOpen },
    { label: "Accounts", path: "/accounts", icon: Building2 },
  ];
  const activeIndex = Math.max(0, navItems.findIndex((item) => isNavActive(item.path)));

  useLayoutEffect(() => {
    const updatePosition = () => {
      const activeEl = itemRefs.current[activeIndex];
      const navEl = navRef.current;
      if (activeEl && navEl) {
        const topOffset = activeEl.offsetTop;
        setIndicatorOffset(topOffset);
        setIndicatorHeight(activeEl.offsetHeight);
      }
    };

    updatePosition();
    // Re-check after font loading or layout shifts
    const timeoutId = setTimeout(updatePosition, 50);
    window.addEventListener("resize", updatePosition);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updatePosition);
    };
  }, [activeIndex]);

  return (
    <aside className="floating-sidebar" style={styles.sidebar}>
      <nav className="sidebar-nav" ref={navRef} style={{ "--active-index": activeIndex }}>
        {activeIndex >= 0 && (
          <span
            className="sidebar-active-indicator"
            aria-hidden="true"
            style={{
              transform: `translateY(${indicatorOffset || activeIndex * 50}px)`,
              height: `${indicatorHeight || 44}px`,
            }}
          />
        )}
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isNavActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              ref={(el) => (itemRefs.current[index] = el)}
              className={`sidebar-nav-item${active ? " sidebar-nav-item--active" : ""}`}
            >
              <Icon size={18} className="sidebar-nav-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "240px",
    background: "var(--bg-surface)",
    borderRight: "1px solid var(--bg-card-border)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "20px 16px",
    flexShrink: 0,
    minHeight: "calc(100vh - 100px)",
    position: "sticky",
    top: "16px",
    height: "calc(100vh - 100px)",
    overflowY: "auto",
  },
};
