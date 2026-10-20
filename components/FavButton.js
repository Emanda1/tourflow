"use client";
import { useEffect, useState } from "react";

const KEY = "tf_saved_tours";
export function readSaved() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function writeSaved(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); window.dispatchEvent(new Event("tf-saved")); } catch {}
}

/** Heart button to save a tour for later (kept in this browser only). */
export default function FavButton({ slug }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(readSaved().includes(slug));
    sync();
    window.addEventListener("tf-saved", sync);
    return () => window.removeEventListener("tf-saved", sync);
  }, [slug]);
  return (
    <button type="button" className={`fav ${on ? "fav-on" : ""}`} aria-pressed={on} aria-label={on ? "Remove from saved trips" : "Save this trip"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); const list = readSaved(); writeSaved(on ? list.filter((s) => s !== slug) : [...list, slug]); }}>
      {on ? "♥" : "♡"}
    </button>
  );
}
