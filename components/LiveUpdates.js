"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const fmt = (p) => "GH₵ " + (p / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 });

/** Checks for new bookings, payments and trip requests every 30 seconds and pops up a notice. */
export default function LiveUpdates() {
  const router = useRouter();
  const last = useRef(null);
  const [notes, setNotes] = useState([]);
  const [watching, setWatching] = useState(false); // only show "Live updates on" for staff who receive some

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const r = await fetch("/admin/pulse", { cache: "no-store" });
        if (!r.ok) return;
        const now = await r.json();
        setWatching(Object.keys(now).length > 0);
        const prev = last.current;
        last.current = now;
        if (!prev) return;
        const fresh = [];
        if (now.booking && now.booking.id !== prev.booking?.id) fresh.push({ id: "b" + now.booking.id, href: `/admin/bookings/${now.booking.id}`, text: `New booking ${now.booking.ref}: ${now.booking.name} · ${now.booking.travellers} traveller${now.booking.travellers > 1 ? "s" : ""}` });
        if (now.payment && now.payment.id !== prev.payment?.id) fresh.push({ id: "p" + now.payment.id, href: `/admin/bookings/${now.payment.bookingId}`, text: `Payment received: ${fmt(now.payment.amount)}` });
        if (now.enquiry && now.enquiry !== prev.enquiry) fresh.push({ id: "e" + now.enquiry, href: "/admin/enquiries", text: "New trip request from the website" });
        if (fresh.length && !stop) {
          setNotes((n) => [...fresh, ...n].slice(0, 3));
          router.refresh();
        }
      } catch {}
    }
    tick();
    const t = setInterval(() => { if (document.visibilityState === "visible") tick(); }, 30000);
    return () => { stop = true; clearInterval(t); };
  }, [router]);

  if (!watching) return null;
  if (!notes.length) return <span className="small" style={{ padding: "0 12px", opacity: .75 }}><span className="live-dot" />Live updates on</span>;
  return (
    <>
      <span className="small" style={{ padding: "0 12px", opacity: .75 }}><span className="live-dot" />Live updates on</span>
      <div className="live-notes" role="status">
        {notes.map((n) => (
          <div key={n.id} className="live-note">
            <a href={n.href}>{n.text}</a>
            <button aria-label="Dismiss" onClick={() => setNotes((x) => x.filter((y) => y.id !== n.id))}>✕</button>
          </div>
        ))}
      </div>
    </>
  );
}
