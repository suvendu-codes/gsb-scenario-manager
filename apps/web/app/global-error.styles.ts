import type { CSSProperties } from "react";

/**
 * Inline styles for the global error page. It replaces the whole document, so
 * the app's stylesheet (and Tailwind classes) are not available here.
 */
export const globalErrorStyles = {
  body: {
    margin: 0,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    textAlign: "center",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    background: "#f7f6f4",
    color: "#1d1e20",
  },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  description: { margin: 0, maxWidth: 480, fontSize: 14, lineHeight: 1.45, color: "#54555b" },
  button: {
    marginTop: 8,
    padding: "8px 16px",
    border: "none",
    borderRadius: 10,
    background: "#e85b31",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
} satisfies Record<string, CSSProperties>;
