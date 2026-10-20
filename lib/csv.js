export function toCsv(rows, columns) {
  const esc = (v) => {
    let s = v == null ? "" : String(v);
    // Stop spreadsheet formula injection from customer-typed text (e.g. a name starting with "=").
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map(([, label]) => esc(label)).join(",");
  const body = rows.map((r) => columns.map(([key]) => esc(typeof key === "function" ? key(r) : r[key])).join(","));
  return "﻿" + [head, ...body].join("\r\n");
}

export function csvResponse(csv, filename) {
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
