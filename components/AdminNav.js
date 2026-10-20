"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ links }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]); // close the phone menu after choosing a page
  const current = links.find((l) => (l.href === "/admin" ? path === "/admin" : path.startsWith(l.href)));
  return (
    <>
      <button type="button" className="nav-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span aria-hidden>☰</span> {current ? current.label : "Menu"}
      </button>
      <nav className={open ? "open" : ""}>
        {links.map(({ href, label, count }) => {
          const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
              {label}{count ? <span className="count">{count}</span> : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
