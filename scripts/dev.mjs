#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch (error) {
  if (
    !(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    )
  ) {
    throw error;
  }
}

const selector = process.argv[2];
const contracts = spawnSync(
  "pnpm",
  ["--filter", "@image-everything/contracts", "build"],
  { cwd: process.cwd(), env: process.env, stdio: "inherit" },
);
if (contracts.error) throw contracts.error;
if (contracts.status !== 0) process.exit(contracts.status ?? 1);

const args = selector
  ? ["--filter", selector, "dev"]
  : ["-r", "--parallel", "run", "dev"];
const child = spawn("pnpm", args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

const signalExitCodes = { SIGINT: 130, SIGTERM: 143 };
for (const signal of Object.keys(signalExitCodes)) {
  process.on(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = signal ? (signalExitCodes[signal] ?? 1) : (code ?? 1);
});
