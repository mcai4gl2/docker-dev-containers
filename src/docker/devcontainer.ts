/**
 * Devcontainer Detection and Volume Remapping
 *
 * Detects if running inside a VS Code devcontainer and remaps volume
 * paths from container paths to host paths for docker-from-docker.
 *
 * Reference: tools/docker_common.py is_in_devcontainer(),
 *   get_devcontainer_info(), adjust_volume_for_devcontainer()
 */

import * as fs from 'fs';
import * as os from 'os';

export interface DevcontainerInfo {
  /** Path on the host filesystem */
  hostProjectRoot: string;
  /** Path inside the devcontainer */
  containerProjectRoot: string;
}

/**
 * Detect if we're running inside a VS Code devcontainer.
 *
 * Checks:
 * - REMOTE_CONTAINERS_IPC env var
 * - Path starts with /workspaces/
 * - Running as 'vscode' user
 * - REMOTE_CONTAINERS env var
 */
export function isInDevcontainer(): boolean {
  // Check REMOTE_CONTAINERS_IPC
  if (process.env['REMOTE_CONTAINERS_IPC']) {
    return true;
  }

  // Check REMOTE_CONTAINERS
  if (process.env['REMOTE_CONTAINERS']) {
    return true;
  }

  // Check if CWD starts with /workspaces/
  try {
    if (process.cwd().startsWith('/workspaces/')) {
      return true;
    }
  } catch {
    // ignore
  }

  // Check if running as 'vscode' user
  try {
    if (os.userInfo().username === 'vscode') {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Get devcontainer path mapping information.
 *
 * Uses HOST_WORKSPACE_FOLDER env var (set in devcontainer.json containerEnv)
 * to map container paths to host paths.
 */
export function getDevcontainerInfo(workspacePath: string): DevcontainerInfo {
  const hostWorkspace = process.env['HOST_WORKSPACE_FOLDER'];

  return {
    hostProjectRoot: hostWorkspace ?? workspacePath,
    containerProjectRoot: workspacePath,
  };
}

/**
 * Adjust a volume mount path for devcontainer docker-from-docker.
 *
 * When running docker from inside a devcontainer, volume source paths
 * need to reference the HOST filesystem because the Docker daemon runs
 * on the host and cannot access /workspaces/... paths.
 */
export function adjustVolumeForDevcontainer(volume: string, info: DevcontainerInfo): string {
  const parts = volume.split(':');
  if (parts.length < 2) {
    return volume;
  }

  let source = parts[0];
  const target = parts[1];
  const options = parts[2];

  // If source path is inside devcontainer workspace, remap to host path
  if (source.startsWith(info.containerProjectRoot)) {
    const relativePath = source.slice(info.containerProjectRoot.length);
    source = info.hostProjectRoot + relativePath;
  }

  let result = `${source}:${target}`;
  if (options) {
    result += `:${options}`;
  }
  return result;
}

/**
 * Check if Docker socket is available at /var/run/docker.sock.
 */
export function isDockerSocketAvailable(): boolean {
  try {
    return fs.existsSync('/var/run/docker.sock');
  } catch {
    return false;
  }
}
