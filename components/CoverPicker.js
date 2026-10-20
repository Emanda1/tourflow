"use client";
import { useState } from "react";

function style(img) {
  if (!img) return { background: "linear-gradient(135deg,#0f766e,#14b8a6)" };
  if (/^(https?:\/\/|\/|blob:)/.test(img)) return { backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center" };
  return { background: img };
}

export default function CoverPicker({ current }) {
  const [url, setUrl] = useState(current || "");
  const [preview, setPreview] = useState(current || "");
  return (
    <div className="field">
      <label>Cover photo</label>
      <div className="cover-picker">
        <div className="cover-preview" style={style(preview)} />
        <div className="stack" style={{ gap: 8 }}>
          <input type="file" name="cover" accept="image/jpeg,image/png,image/webp"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
          <input name="image_url" value={url} placeholder="…or paste an image link" onChange={(e) => { setUrl(e.target.value); setPreview(e.target.value); }} />
          <span className="small muted">JPG, PNG or WebP, up to 5 MB. Landscape photos look best.</span>
        </div>
      </div>
    </div>
  );
}
