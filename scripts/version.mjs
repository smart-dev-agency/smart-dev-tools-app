// Bump the app version in every file that carries it, in one go.
// Usage: npm run bump            (shows current versions, then prompts)
//        npm run bump -- 2.1.0   (no prompt)
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const write = (file, text) => writeFileSync(join(root, file), text);
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

// file -> how to read the version it currently declares
const files = {
  "package.json": (t) => JSON.parse(t).version,
  "package-lock.json": (t) => JSON.parse(t).version,
  "src-tauri/tauri.conf.json": (t) => JSON.parse(t).version,
  "src-tauri/Cargo.toml": (t) => t.match(/^version = "([^"]+)"/m)[1],
  "src-tauri/Cargo.lock": (t) => t.match(/name = "smart-dev-tools"\r?\nversion = "([^"]+)"/)[1],
};
const versions = () => Object.fromEntries(Object.entries(files).map(([file, get]) => [file, get(read(file))]));

const current = versions();
console.log("Current versions:");
for (const [file, version] of Object.entries(current)) console.log(`  ${version.padEnd(12)} ${file}`);
if (new Set(Object.values(current)).size > 1) console.log("⚠ Files are out of sync; the new version will be written to all of them.");

let next = process.argv[2];
if (!next) {
  const rl = createInterface({ input: stdin, output: stdout });
  next = (await rl.question(`New version (Enter to cancel): `)).trim();
  rl.close();
}
if (!next) {
  console.log("Cancelled, nothing changed.");
  process.exit(0);
}
if (!SEMVER.test(next)) {
  console.error(`Invalid version "${next}", expected MAJOR.MINOR.PATCH`);
  process.exit(1);
}

// package.json + package-lock.json (npm keeps their formatting)
run(`npm version ${next} --no-git-tag-version --allow-same-version`);
// tauri.conf.json: only the top-level "version" key (Tauri labels the installers with it)
write("src-tauri/tauri.conf.json", read("src-tauri/tauri.conf.json").replace(/("version":\s*)"[^"]*"/, `$1"${next}"`));
// Cargo.toml: the [package] version is the only line-leading `version =`
write("src-tauri/Cargo.toml", read("src-tauri/Cargo.toml").replace(/^version = "[^"]+"/m, `version = "${next}"`));
// Cargo.lock: let cargo rewrite the workspace entry (CI runs with --locked)
run("cargo update -w --offline --manifest-path src-tauri/Cargo.toml");

const stale = Object.entries(versions()).filter(([, version]) => version !== next);
if (stale.length) {
  console.error(`❌ Still not at ${next}: ${stale.map(([file, version]) => `${file} (${version})`).join(", ")}`);
  process.exit(1);
}
console.log(`\n✅ All files are now at ${next}.`);
console.log(`Next: add a [${next}] entry to changelog.md, commit, then: git tag v${next} && git push origin main v${next}`);
