import { execFileSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";

if (!existsSync(".git")) {
	console.log("Skipping Git hooks setup: .git directory not found.");
	process.exit(0);
}

if (existsSync(".githooks/pre-push")) {
	chmodSync(".githooks/pre-push", 0o755);
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
	stdio: "inherit",
	shell: process.platform === "win32",
});

console.log("Git hooks path configured: .githooks");
