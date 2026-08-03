import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkgUrl = new URL('../../package.json', import.meta.url);

/** Reads the package version, resolving correctly from src/ and dist/. */
export function getAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), 'utf8')) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
