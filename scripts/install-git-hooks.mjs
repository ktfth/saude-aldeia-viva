import { execFileSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";

if (process.env.CI === "true") {
	console.log("Skipping Git hooks setup: running in CI.");
	process.exit(0);
}

if (!existsSync(".git")) {
	console.log("Skipping Git hooks setup: .git directory not found.");
	process.exit(0);
}

for (const hookPath of [".githooks/pre-commit", ".githooks/pre-push"]) {
	if (existsSync(hookPath)) {
		chmodSync(hookPath, 0o755);
	}
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
	stdio: "inherit",
	shell: process.platform === "win32",
});

console.log("Git hooks path configured: .githooks");
