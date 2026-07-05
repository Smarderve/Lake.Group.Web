#!/usr/bin/env node
/**
 * Clears stale Next.js dev lock and stops orphaned dev servers for this project.
 */
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const root = process.cwd();
const lockPath = join(root, ".next/dev/lock");

function tryKill(pid) {
  if (!pid || Number.isNaN(pid)) return;
  try {
    process.kill(pid, 0);
    execSync(`kill ${pid}`, { stdio: "ignore" });
    console.log(`Stopped stale dev server (PID ${pid})`);
  } catch {
    /* process already gone */
  }
}

if (existsSync(lockPath)) {
  try {
    const info = JSON.parse(readFileSync(lockPath, "utf8"));
    tryKill(info.pid);
  } catch {
    /* ignore parse errors */
  }
  try {
    unlinkSync(lockPath);
    console.log("Removed stale .next/dev/lock");
  } catch {
    /* ignore */
  }
}

// Stop any next dev processes running from this directory
try {
  const out = execSync("pgrep -af 'next dev'", { encoding: "utf8" });
  for (const line of out.split("\n").filter(Boolean)) {
    if (line.includes(root)) {
      const pid = Number(line.trim().split(/\s+/)[0]);
      tryKill(pid);
    }
  }
} catch {
  /* no matching processes */
}

console.log("Dev environment clean. Run: npm run dev");
