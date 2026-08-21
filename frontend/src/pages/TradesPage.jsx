import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import TradeTable from "../components/TradeTable";
import JournalModal from "../components/JournalModal";
import PageTitle from "../components/PageTitle";
import { Search, Filter, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

export default function TradesPage() {
  const { selectedAccount, dateRange } = useAuth();

  const [trades, setTrades] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchSymbol, setSearchSymbol] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [editingTrade, setEditingTrade] = useState(null);

  useEffect(() => {
    fetchTrades(1);
  }, [selectedAccount, dateRange, filterStatus, filterResult]);

  const fetchTrades = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", pageNumber);
      queryParams.append("limit", 15);

      if (selectedAccount) queryParams.append("accountId", selectedAccount);
      if (searchSymbol) queryParams.append("symbol", searchSymbol.trim());
      if (filterStatus) queryParams.append("status", filterStatus);
      if (filterResult) queryParams.append("result", filterResult);
      if (dateRange.startDate) queryParams.append("startDate", dateRange.startDate);
      if (dateRange.endDate) queryParams.append("endDate", dateRange.endDate);

      const data = await api.get(`/trades?${queryParams.toString()}`);
      setTrades(data.trades || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error("Error fetching trades:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTrades(1);
  };

  const handleDeleteTrade = async (tradeId) => {
    if (!window.confirm("Are you sure you want to delete this trade?")) return;
    try {
      await api.delete(`/trades/${tradeId}`);
      fetchTrades(pagination.page);
    } catch (err) {
      alert(`Failed to delete trade: ${err.message}`);
    }
  };

  return (
    <div>
      <PageTitle
        title="Matched Trades & Journal Log"
        subtitle="Review matched FIFO positions, risk-to-reward ratios, setups, and psychological journal entries"
      />

      {/* Filter Bar */}
      <div className="card" style={styles.filterCard}>
        <form onSubmit={handleSearchSubmit} style={styles.filterForm}>
          {/* Symbol Search */}
          <div style={styles.searchWrapper}>
            <Search size={16} color="#64748b" style={styles.searchIcon} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px" }}
              placeholder="Search symbol (e.g. RELIANCE)..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="CLOSED">CLOSED Only</option>
            <option value="PARTIAL">PARTIAL Only</option>
            <option value="OPEN">OPEN Only</option>
          </select>

          {/* Result Filter */}
          <select
            className="form-select"
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
          >
            <option value="">All Results</option>
            <option value="WIN">WIN Trades</option>
            <option value="LOSS">LOSS Trades</option>
            <option value="BREAKEVEN">BREAKEVEN Trades</option>
          </select>

          <button type="submit" className="btn btn-secondary">
            Filter Trades
          </button>
        </form>
      </div>

      {/* Trade Table */}
      <TradeTable
        trades={trades}
        onEditJournal={(trade) => setEditingTrade(trade)}
        onDeleteTrade={handleDeleteTrade}
      />

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div style={styles.paginationBar}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total trades)
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-secondary"
              disabled={pagination.page <= 1}
              onClick={() => fetchTrades(pagination.page - 1)}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              className="btn btn-secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchTrades(pagination.page + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Journal Editor Modal */}
      {editingTrade && (
        <JournalModal
          trade={editingTrade}
          onClose={() => setEditingTrade(null)}
          onSaveSuccess={() => fetchTrades(pagination.page)}
        />
      )}
    </div>
  );
}

const styles = {
  pageHeader: {
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
  },
  filterCard: {
    marginBottom: "24px",
    padding: "16px 20px",
  },
  filterForm: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    position: "relative",
    flex: 1,
    minWidth: "220px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  paginationBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "20px",
    padding: "12px 16px",
    background: "var(--bg-card)",
    border: "1px solid var(--bg-card-border)",
    borderRadius: "10px",
  },
};
