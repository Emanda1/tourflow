"use client";
import { useEffect, useRef, useState } from "react";
import { shrinkInputFiles } from "./shrinkImage";

export const MAX_PHOTOS = 12;
const MAX_NEW = 8;

/** Tour photo gallery: shows current photos (tick to remove) and lets staff add several at once. */
export default function GalleryPicker({ photos = [] }) {
  const input = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const room = Math.max(0, MAX_PHOTOS - photos.length);

  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p)), [previews]);

  async function onPick(e) {
    const el = e.target;
    setNote("");
    let files = [...(el.files || [])];
    const limit = Math.min(MAX_NEW, room);
    if (files.length > limit) {
      const dt = new DataTransfer();
      files.slice(0, limit).forEach((f) => dt.items.add(f));
      el.files = dt.files;
      setNote(`Only the first ${limit} photo${limit === 1 ? "" : "s"} will be added${room < MAX_NEW ? ` (a tour can have up to ${MAX_PHOTOS})` : " this time. Save, then add more"}.`);
    }
    setBusy(true);
    files = await shrinkInputFiles(el);
    setBusy(false);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  return (
    <div className="field">
      <label htmlFor="tf-photos">Photo gallery <span className="muted small">({photos.length} of {MAX_PHOTOS})</span></label>
      {photos.length > 0 && (
        <div className="gallery-admin">
          {photos.map((p) => (
            <label key={p.id} className="gallery-admin-item">
              <img src={p.url} alt="" />
              <span className="inline-check small"><input type="checkbox" name="remove_photo" value={p.id} /> Remove</span>
            </label>
          ))}
        </div>
      )}
      {room > 0 ? (
        <>
          <input ref={input} id="tf-photos" type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" onChange={onPick} />
          <span className="small muted">Choose up to {Math.min(MAX_NEW, room)} photos at a time. Large phone photos are made smaller automatically.{busy ? " Preparing photos…" : ""}</span>
          {note && <span className="small" style={{ color: "var(--warn, #b45309)" }}>{note}</span>}
          {previews.length > 0 && <div className="gallery-admin">{previews.map((u) => <div key={u} className="gallery-admin-item"><img src={u} alt="" /><span className="small muted">New</span></div>)}</div>}
        </>
      ) : <span className="small muted">The gallery is full. Remove a photo to add another.</span>}
    </div>
  );
}
