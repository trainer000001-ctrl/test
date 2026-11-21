import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Loads a JSON artifact from `/public/...` using the local Node.js filesystem.
 */
export async function loadPublicJsonAsset<T>(assetPath: string): Promise<T | null> {
  const normalized = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  try {
    const localFile = join(process.cwd(), "public", normalized.replace(/^\/+/, ""));
    const raw = await readFile(localFile, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
