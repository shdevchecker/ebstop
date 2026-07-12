/**
 * lib/storage.ts — the app's media storage seam.
 *
 * Provider output URLs expire, so the media layer downloads each finished generation and PUTs
 * the bytes here; the app then serves/links OUR url. The Community edition ships one
 * implementation: local disk. It writes under `.storage/` (gitignored) and serves via
 * /api/storage/<key>.
 *
 * Swap storage by implementing StorageAdapter and returning it from getStorage().
 *
 * Server-only: touches the filesystem.
 */
import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

export interface StorageAdapter {
  id: string;
  /** Store bytes under `key`; returns a URL the app can serve/link. */
  put(buffer: Buffer, key: string, contentType?: string): Promise<string>;
  /** Read the bytes back, or null when absent. */
  get(key: string): Promise<Buffer | null>;
  /** Remove the object (best-effort). */
  delete(key: string): Promise<void>;
}

/** Where the local adapter writes (relative to the project root). Gitignored. */
export const LOCAL_STORAGE_DIR = ".storage";
/** Route prefix the local adapter's URLs point at. */
export const LOCAL_STORAGE_URL_PREFIX = "/api/storage";

/** Normalize a key and reject anything that could escape the storage root (path traversal). */
export function safeStorageKey(key: string): string {
  if (key.includes("\0")) throw new Error("invalid storage key");
  const cleaned = normalize(key).replace(/\\/g, "/").replace(/^\/+/, "");
  if (cleaned === ".." || cleaned.startsWith("../") || cleaned.includes("/../")) {
    throw new Error("invalid storage key");
  }
  return cleaned;
}

/** Local-disk storage. `baseDir` is injectable for tests. */
export function createLocalStorage(
  baseDir: string = LOCAL_STORAGE_DIR,
): StorageAdapter {
  return {
    id: "local",
    async put(buffer, key) {
      const clean = safeStorageKey(key);
      const filePath = join(baseDir, clean);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, buffer);
      return `${LOCAL_STORAGE_URL_PREFIX}/${clean}`;
    },
    async get(key) {
      const clean = safeStorageKey(key);
      try {
        return await readFile(join(baseDir, clean));
      } catch {
        return null;
      }
    },
    async delete(key) {
      const clean = safeStorageKey(key);
      await rm(join(baseDir, clean), { force: true });
    },
  };
}

let cached: StorageAdapter | null = null;

/** The active storage adapter: local disk. */
export function getStorage(): StorageAdapter {
  if (cached) return cached;
  cached = createLocalStorage();
  return cached;
}
