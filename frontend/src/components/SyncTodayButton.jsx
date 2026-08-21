import React, { useState } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

/**
 * Sync today's trades for a given Upstox account.
 *
 * POST /api/v1/upstox/sync/:accountId
 * Body: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
 */
export default function SyncTodayButton({ accountId, onSyncSuccess }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const getTodayDate = () => new Date().toISOString().slice(0, 10);

  const handleSync = async () => {
    if (!accountId) return;
    setLoading(true);

    const today = getTodayDate();

    try {
      const result = await api.post(`/upstox/sync/${accountId}`, {
        startDate: today,
        endDate: today,
      });

      const inserted = result?.inserted ?? 0;
      const processed = result?.processed ?? 0;

      showToast(
        `Today's sync complete — ${inserted} new execution${inserted !== 1 ? "s" : ""} inserted, ${processed} FIFO matched.`,
        "success"
      );

      if (typeof onSyncSuccess === "function") {
        onSyncSuccess(result);
      }
    } catch (err) {
      showToast(err.message || "Failed to sync today's Upstox trades.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={handleSync}
      disabled={loading}
      style={{ padding: "6px 12px", fontSize: "0.8rem" }}
      title="Sync today's Upstox trades"
    >
      {loading ? (
        <RefreshCw size={14} className="spin" />
      ) : (
        <CheckCircle2 size={14} color="var(--color-profit)" />
      )}
      <span>{loading ? "Syncing..." : "Sync Today"}</span>
    </button>
  );
}
