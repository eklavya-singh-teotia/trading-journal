import React from "react";
import { ExternalLink, Zap } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

/**
 * Redirects the browser to the backend Upstox OAuth initiation endpoint.
 * The backend handles the full OAuth flow — no credentials are handled here.
 * GET /api/v1/upstox/auth
 *   -> redirects to Upstox authorization dialog
 *   -> Upstox redirects back to /api/v1/upstox/callback
 *   -> backend redirects to /dashboard?broker=upstox&status=success|error
 */
export default function ConnectUpstoxButton({ style = {} }) {
  const handleConnect = () => {
    window.location.href = `${API_BASE_URL}/upstox/auth`;
  };

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={handleConnect}
      style={{ gap: "8px", ...style }}
    >
      <Zap size={16} />
      <span>Connect via Upstox OAuth</span>
      <ExternalLink size={14} style={{ opacity: 0.7 }} />
    </button>
  );
}
