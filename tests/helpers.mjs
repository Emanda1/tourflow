import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Each test file gets its own empty database in a temp folder.
export function useTempData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tourflow-test-"));
  process.env.DATA_DIR = dir;
  process.env.SEED_DEMO_DATA = "false";
  return dir;
}
