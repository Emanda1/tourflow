"use client";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="container" style={{ maxWidth: 520, padding: "100px 20px", textAlign: "center" }}>
      <h1>Something went wrong</h1>
      <p className="muted">Sorry, we couldn't load this page. Please try again. If you were paying, don't pay twice: check your booking first.</p>
      <div className="row" style={{ justifyContent: "center" }}><button className="btn" onClick={() => reset()}>Try again</button><a className="btn btn-secondary" href="/">Home</a></div>
    </main>
  );
}
