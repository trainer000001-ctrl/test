import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const violations = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(entryPath);
      continue;
    }
    if (!/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) continue;

    const relativePath = path.relative(sourceRoot, entryPath).replaceAll(path.sep, "/");
    const source = await readFile(entryPath, "utf8");
    const imports = [...source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)].map(match => match[1]);

    for (const importedPath of imports) {
      if (relativePath.startsWith("features/") && importedPath.startsWith("../features/")) {
        violations.push(`${relativePath} imports a sibling feature directly: ${importedPath}`);
      }
      if (relativePath.startsWith("features/") && importedPath.startsWith("../store/")) {
        violations.push(`${relativePath} bypasses the feature interface and imports the store: ${importedPath}`);
      }
      if (!relativePath.startsWith("lib/") && importedPath.includes("@tauri-apps/api/")) {
        violations.push(`${relativePath} bypasses the native API adapter: ${importedPath}`);
      }
    }
  }
}

await visit(sourceRoot);
if (violations.length) {
  throw new Error(`Frontend dependency boundary violations:\n${violations.map(value => `- ${value}`).join("\n")}`);
}

console.log("Frontend dependency boundaries passed.");
