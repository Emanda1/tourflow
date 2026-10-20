"use client";
import { useState } from "react";

export default function ShareButton({ title }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return <button type="button" className="btn btn-secondary btn-sm" onClick={share}>{copied ? "Link copied ✓" : "Share trip"}</button>;
}
