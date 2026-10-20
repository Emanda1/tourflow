"use client";
import { useEffect, useState } from "react";

const FLAGS = ["paid", "failed", "error", "saved", "sent", "created", "reminded", "refunded", "busy", "done"];

/** Shows a short-lived message, then removes the ?flag from the address bar. */
export default function Toast({ message, type = "ok" }) {
  const [show, setShow] = useState(Boolean(message));
  useEffect(() => {
    if (!message) return;
    setShow(true);
    const url = new URL(window.location.href);
    FLAGS.forEach((f) => url.searchParams.delete(f));
    window.history.replaceState(null, "", url.pathname + url.search);
    const t = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(t);
  }, [message]);
  if (!show || !message) return null;
  return (
    <div className={`toast toast-${type}`} role="status">
      <span className="toast-icon">{type === "ok" ? "✓" : "!"}</span>{message}
      <button onClick={() => setShow(false)} aria-label="Dismiss">✕</button>
    </div>
  );
}
