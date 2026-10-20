/** Amounts are stored in pesewas (1 GHS = 100 pesewas). */
export function money(pesewas) {
  const v = (pesewas || 0) / 100;
  return "GH₵ " + v.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function toPesewas(cedis) {
  const n = Number(String(cedis ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function date(iso) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso.replace(" ", "T"));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function dateRange(start, end) {
  if (!end || end === start) return date(start);
  return `${date(start)} – ${date(end)}`;
}

export function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function lines(text) {
  return String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
}

export function coverStyle(image) {
  if (!image) return { background: "linear-gradient(135deg,#0f766e,#14b8a6)" };
  if (/^(https?:\/\/|\/)/.test(image)) return { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" };
  return { background: image };
}

/** Normalises Ghana phone numbers to +233XXXXXXXXX. */
export function normalisePhone(raw) {
  let p = String(raw || "").replace(/[^0-9+]/g, "");
  if (p.startsWith("+")) return p;
  if (p.startsWith("233")) return "+" + p;
  if (p.startsWith("0")) return "+233" + p.slice(1);
  return p;
}
