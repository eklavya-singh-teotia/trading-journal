import React, { useState } from "react";
import { ExternalLink, Zap } from "lucide-react";
import { api } from "../services/api";

/**
 * Fetches the Upstox OAuth authorization URL from the backend (via cookie-authenticated API call),
 * then navigates the browser to it.
 * GET /api/v1/upstox/auth -> returns { authorizationUrl }
 *   -> browser navigates to Upstox authorization dialog
 *   -> Upstox redirects back to /api/v1/upstox/callback
 *   -> backend redirects to /dashboard?broker=upstox&status=success|error
 */
export default function ConnectUpstoxButton({ style = {} }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const data = await api.get("/upstox/auth");
      if (data?.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (err) {
      console.error("Failed to initiate Upstox connection:", err);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={handleConnect}
      disabled={loading}
      style={{ gap: "8px", ...style }}
    >
      <Zap size={16} />
      <span>{loading ? "Connecting..." : "Connect via Upstox OAuth"}</span>
      <ExternalLink size={14} style={{ opacity: 0.7 }} />
    </button>
  );
}
