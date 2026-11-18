// `npm run dev:fixture [name]` — next dev against a committed USGS fixture
// (default: synthetic). Cross-platform alternative to `USGS_FIXTURE=1 next dev`.
import { spawn } from "node:child_process";

const name = process.argv[2] ?? "synthetic";
const child = spawn("npx", ["next", "dev", ...process.argv.slice(3)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, USGS_FIXTURE: name },
});
child.on("exit", (code) => process.exit(code ?? 0));
