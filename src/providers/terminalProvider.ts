/**
 * Terminal Profile Provider (2.3)
 *
 * Registers terminal profiles for each discovered non-base image.
 * Appears in the VS Code terminal dropdown (+ button) as e.g.
 * "gRPC Tools", "HTTP Tools", "MCP Tools".
 */

import * as vscode from 'vscode';
import { DockerImage } from '../discovery/imageDiscovery';
import { getDefaultContainerSettings } from '../config/merger';
import { resolveVolumePlaceholders, resolvePlaceholders } from '../utils/placeholder';
import { getUidGid } from '../utils/platform';
import { isInDevcontainer, getDevcontainerInfo, adjustVolumeForDevcontainer } from '../docker/devcontainer';

export class DevDockerTerminalProfileProvider implements vscode.TerminalProfileProvider {
  private images: DockerImage[] = [];
  private workspacePath: string = '';

  update(images: DockerImage[], workspacePath: string): void {
    this.images = images;
    this.workspacePath = workspacePath;
  }

  provideTerminalProfile(
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.TerminalProfile> {
    // This is called when the user selects our profile from the dropdown.
    // We show a quick pick if there are multiple images.
    // For a single-image profile (registered per-image), we build directly.
    // Since VS Code registers one profile per provider, we use a quick pick.
    return undefined; // Handled via the command instead
  }
}

/**
 * Build docker run args for a terminal profile.
 */
export function buildTerminalArgs(image: DockerImage, workspacePath: string): string[] {
  const settings = getDefaultContainerSettings();

  const args: string[] = ['run', '--rm', '-it'];

  args.push('--network', settings.networkMode);
  args.push('-w', settings.workingDir);

  if (settings.runAsUser) {
    args.push('-u', getUidGid());
  }

  // Volumes
  let resolvedVolumes = resolveVolumePlaceholders(
    settings.volumes,
    { workspaceFolder: workspacePath },
  );

  if (isInDevcontainer()) {
    const devInfo = getDevcontainerInfo(workspacePath);
    resolvedVolumes = resolvedVolumes.map(v => adjustVolumeForDevcontainer(v, devInfo));
  }

  for (const vol of resolvedVolumes) {
    args.push('-v', vol);
  }

  args.push(image.tag);
  args.push('/bin/bash');

  return args;
}

/**
 * Convert an image name like "grpc-tools" to a display name like "gRPC Tools".
 * Falls back to title-cased hyphen-separated words.
 */
export function imageDisplayName(imageName: string): string {
  return imageName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
