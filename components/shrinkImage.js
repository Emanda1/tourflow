// Shrinks photos in the browser before upload: phone photos are often 4–10 MB, which is slow on
// mobile data and over the upload limit. Re-saving also removes hidden data such as GPS location.
const MAX_SIDE = 1920;

export async function shrinkImage(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900 * 1024) { bmp.close?.(); return file; } // already small
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const keepPng = file.type === "image/png" && file.size < 1.5 * 1024 * 1024; // logos/graphics with transparency
    const type = keepPng ? "image/png" : "image/jpeg";
    const blob = await new Promise((res) => canvas.toBlob(res, type, 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + (keepPng ? ".png" : ".jpg"), { type });
  } catch {
    return file; // the server still checks size and type
  }
}

/** Replaces the files in a file input with shrunk copies. */
export async function shrinkInputFiles(input) {
  const files = [...(input.files || [])];
  if (!files.length || typeof DataTransfer === "undefined") return files;
  const out = await Promise.all(files.map(shrinkImage));
  const dt = new DataTransfer();
  out.forEach((f) => dt.items.add(f));
  input.files = dt.files;
  return out;
}
