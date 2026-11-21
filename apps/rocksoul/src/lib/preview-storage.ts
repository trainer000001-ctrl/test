export function readPreview<Value>(key: string, fallback: Value): Value {
  try {
    const stored = localStorage.getItem(`rocksoul:${key}`);
    return stored === null ? fallback : ((JSON.parse(stored) as Value) ?? fallback);
  } catch {
    return fallback;
  }
}

export function writePreview(key: string, value: unknown): void {
  localStorage.setItem(`rocksoul:${key}`, JSON.stringify(value));
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function isJsonObject(value: string): boolean {
  try {
    return !Array.isArray(JSON.parse(value)) && typeof JSON.parse(value) === "object";
  } catch {
    return false;
  }
}

export type PreviewCommandOutcome =
  | { handled: true; value: unknown }
  | { handled: false };
