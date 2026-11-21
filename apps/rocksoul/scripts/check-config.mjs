import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";

const jsonFiles = [
  "package.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/capabilities/default.json",
];
const tomlFiles = ["src-tauri/Cargo.toml", "src-tauri/rustfmt.toml"];

for (const file of jsonFiles) {
  JSON.parse(await readFile(file, "utf8"));
  console.log(`Valid JSON: ${file}`);
}

for (const file of tomlFiles) {
  parseToml(await readFile(file, "utf8"));
  console.log(`Valid TOML: ${file}`);
}

parseYaml(await readFile(".github/workflows/ci.yml", "utf8"));
console.log("Valid YAML: .github/workflows/ci.yml");

const tauriConfig = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));
if (JSON.stringify(tauriConfig.bundle.targets) !== JSON.stringify(["msi", "nsis"])) {
  throw new Error("Tauri bundle targets must remain Windows MSI and NSIS.");
}
if (!tauriConfig.app.security.csp || !tauriConfig.app.security.devCsp) {
  throw new Error("Production and development CSP policies must both be configured.");
}
if (tauriConfig.app.security.csp.includes("unsafe-eval")) {
  throw new Error("Production CSP must not enable unsafe-eval.");
}
if (!tauriConfig.app.security.csp.includes("script-src 'self'")) {
  throw new Error("Production CSP must restrict scripts to packaged application assets.");
}

const gitIgnore = await readFile(".gitignore", "utf8");
const tauriGitIgnore = await readFile("src-tauri/.gitignore", "utf8");
if (!gitIgnore.includes("node_modules") || !gitIgnore.includes("dist")) {
  throw new Error("Frontend generated output must remain ignored.");
}
if (!tauriGitIgnore.includes("/target") || !tauriGitIgnore.includes("/gen")) {
  throw new Error("Tauri generated output must remain ignored.");
}

const packageConfig = JSON.parse(await readFile("package.json", "utf8"));
const requiredGates = ["audit", "check:config", "check:boundaries", "check:commands", "lint", "typecheck", "test:coverage", "build"];
for (const gate of requiredGates) {
  if (!packageConfig.scripts[gate]) {
    throw new Error(`Required local quality-gate script is missing: ${gate}`);
  }
}
const gateRunner = await readFile("scripts/gate-check.ps1", "utf8");
for (const gate of ["typecheck", "check:commands", "clippy"]) {
  if (!gateRunner.includes(`"${gate}"`)) {
    throw new Error(`Mandatory gate runner is missing required check: ${gate}`);
  }
}
const workspaceFile = existsSync("pnpm-workspace.yaml")
  ? "pnpm-workspace.yaml"
  : "../../pnpm-workspace.yaml";
const pnpmWorkspace = await readFile(workspaceFile, "utf8");
if (!pnpmWorkspace.includes("packages:") || !pnpmWorkspace.includes("allowBuilds:")) {
  throw new Error("pnpm workspace must explicitly declare package and build-script policy.");
}

console.log("Project configuration invariants passed.");
