import { checkEnvironment } from "./lib/env.js";
import { startJobs } from "./lib/jobs.js";

try {
  checkEnvironment();
} catch (e) {
  console.error(`[config] ${e.message}`);
  process.exit(1); // refuse to run with unsafe settings
}
startJobs();
