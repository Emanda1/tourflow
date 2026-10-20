"use client";
import { useEffect } from "react";

// Shown only if the main page layout itself fails, so it must include <html> and <body>.
export default function GlobalError({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "100px 20px", color: "#1c1917" }}>
        <h1>Something went wrong</h1>
        <p>Sorry, the site couldn't load. Please try again in a moment.</p>
        <button onClick={() => reset()} style={{ padding: "10px 18px", borderRadius: 10, border: 0, background: "#0f766e", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
      </body>
    </html>
  );
}
