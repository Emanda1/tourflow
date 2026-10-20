// Runs once when the server starts: checks settings and starts background jobs.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node.js");
  }
}
