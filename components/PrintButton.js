"use client";
export default function PrintButton({ label = "Print manifest" }) {
  return <button type="button" className="btn btn-sm" onClick={() => window.print()}>{label}</button>;
}
