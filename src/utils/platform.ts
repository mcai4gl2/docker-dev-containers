/**
 * OS-specific utilities: uid/gid, paths.
 */

import * as os from 'os';
import { execSync } from 'child_process';

/**
 * Get the current user's UID and GID (Linux/macOS).
 * Returns "0:0" on Windows as a fallback.
 */
export function getUidGid(): string {
  if (process.platform === 'win32') {
    return '0:0';
  }
  try {
    const uid = process.getuid?.() ?? 0;
    const gid = process.getgid?.() ?? 0;
    return `${uid}:${gid}`;
  } catch {
    return '0:0';
  }
}
