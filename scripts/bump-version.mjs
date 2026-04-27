import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const allowedBumps = new Set([
	"patch",
	"minor",
	"major",
	"prepatch",
	"preminor",
	"premajor",
	"prerelease",
]);
const bump = process.argv[2] ?? "patch";
const isPrePush = process.argv.includes("--pre-push");

if (!allowedBumps.has(bump)) {
	throw new Error(
		`Unsupported version bump "${bump}". Use one of: ${[...allowedBumps].join(", ")}`,
	);
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const previousVersion = packageJson.version;

execFileSync("npm", ["version", bump, "--no-git-tag-version"], {
	stdio: "inherit",
	shell: process.platform === "win32",
});

const updatedPackageJson = JSON.parse(await readFile("package.json", "utf8"));
const nextVersion = updatedPackageJson.version;

const jsrJson = JSON.parse(await readFile("jsr.json", "utf8"));
jsrJson.version = nextVersion;
await writeFile("jsr.json", `${JSON.stringify(jsrJson, null, 2)}\n`);

console.log(`Version bumped: ${previousVersion} -> ${nextVersion}`);

if (isPrePush) {
	console.error(
		"\npre-push: version files were updated for a main-branch publish.",
	);
	console.error(
		"Commit package.json, package-lock.json, and jsr.json, then push again.",
	);
	process.exit(1);
}
