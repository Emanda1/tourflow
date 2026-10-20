"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ links }) {
  const path = usePathname();
  return (
    <nav>
      {links.map(({ href, label, count }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? "active" : ""}>
            {label}{count ? <span className="count">{count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
