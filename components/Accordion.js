"use client";
import { useState } from "react";

export default function Accordion({ items, openFirst = true }) {
  const [open, setOpen] = useState(openFirst ? 0 : -1);
  const allOpen = open === "all";
  return (
    <div className="accordion">
      <button type="button" className="link-btn small" onClick={() => setOpen(allOpen ? -1 : "all")}>{allOpen ? "Collapse all" : "Expand all"}</button>
      {items.map((it, i) => {
        const isOpen = allOpen || open === i;
        return (
          <div key={i} className={`acc-item ${isOpen ? "acc-open" : ""}`}>
            <button type="button" className="acc-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen && !allOpen ? -1 : i)}>
              <span className="acc-num">{i + 1}</span>
              <span>{it.title}</span>
              <span className="acc-caret" aria-hidden>▾</span>
            </button>
            {isOpen && <div className="acc-body">{it.body}</div>}
          </div>
        );
      })}
    </div>
  );
}
