"use client";
import { useEffect, useRef, useState } from "react";

/** Photo grid for a tour page. Tap a photo to see it large; swipe/arrow keys move between photos. */
export default function Gallery({ photos, title }) {
  const dialog = useRef(null);
  const [i, setI] = useState(0);
  const touchX = useRef(null);
  const n = photos.length;
  const show = (k) => { setI(((k % n) + n) % n); };
  const open = (k) => { show(k); dialog.current?.showModal(); };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onKey = (e) => {
      if (!d.open) return;
      if (e.key === "ArrowRight") setI((v) => (v + 1) % n);
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n]);

  const visible = photos.slice(0, 5);
  return (
    <section className="gallery" aria-label="Photos">
      <div className={`gallery-grid gallery-n${Math.min(visible.length, 5)}`}>
        {visible.map((p, k) => (
          <button key={p.id} type="button" className="gallery-cell" onClick={() => open(k)} aria-label={`View photo ${k + 1} of ${n}`}>
            <img src={p.url} alt={`${title}, photo ${k + 1}`} loading="lazy" />
            {k === visible.length - 1 && n > visible.length && <span className="gallery-more">+{n - visible.length} more</span>}
          </button>
        ))}
      </div>

      <dialog ref={dialog} className="lightbox" onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touchX.current ?? 0); if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); }}>
        <img src={photos[i]?.url} alt={`${title}, photo ${i + 1} of ${n}`} />
        <div className="lightbox-bar">
          <button type="button" onClick={() => show(i - 1)} aria-label="Previous photo" disabled={n < 2}>‹</button>
          <span>{i + 1} / {n}</span>
          <button type="button" onClick={() => show(i + 1)} aria-label="Next photo" disabled={n < 2}>›</button>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close">✕</button>
        </div>
      </dialog>
    </section>
  );
}
