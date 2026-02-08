/**
 * VS Code Settings Integration
 *
 * Reads devdocker.* settings from VS Code configuration.
 */

import * as vscode from 'vscode';
import { DockerDefaults, DEFAULT_SETTINGS } from './defaults';

/**
 * Read the current DevDocker defaults from VS Code settings.
 */
export function getSettingsDefaults(): DockerDefaults {
  const config = vscode.workspace.getConfiguration('devdocker');

  return {
    networkMode: config.get<string>('defaults.networkMode', DEFAULT_SETTINGS.networkMode),
    runAsUser: config.get<boolean>('defaults.runAsUser', DEFAULT_SETTINGS.runAsUser),
    volumes: config.get<string[]>('defaults.volumes', DEFAULT_SETTINGS.volumes),
    workingDir: config.get<string>('defaults.workingDir', DEFAULT_SETTINGS.workingDir),
    ports: config.get<string[]>('defaults.ports', DEFAULT_SETTINGS.ports),
  };
}

/**
 * Get the configured docker directory (relative to workspace root).
 */
export function getDockerDirectory(): string {
  const config = vscode.workspace.getConfiguration('devdocker');
  return config.get<string>('dockerDirectory', 'docker');
}

/**
 * Get the configured GHCR registry path, or empty string if not set.
 */
export function getGhcrRegistry(): string {
  const config = vscode.workspace.getConfiguration('devdocker');
  return config.get<string>('ghcrRegistry', '');
}
