/**
 * Resolve placeholders in strings.
 *
 * Supports:
 * - {workspaceFolder} -> VS Code workspace folder path
 * - {project_root} -> same as workspaceFolder (backward compat)
 * - ${VAR} -> environment variable lookup
 */

import * as os from 'os';

export interface PlaceholderContext {
  workspaceFolder: string;
}

/**
 * Resolve placeholders in a single string.
 */
export function resolvePlaceholders(value: string, ctx: PlaceholderContext): string {
  let result = value;

  // Resolve {workspaceFolder} and {project_root}
  result = result.replace(/\{workspaceFolder\}/g, ctx.workspaceFolder);
  result = result.replace(/\{project_root\}/g, ctx.workspaceFolder);

  // Resolve ${VAR} environment variable references
  result = result.replace(/\$\{([^}]+)\}/g, (_match, varName: string) => {
    return process.env[varName] ?? '';
  });

  return result;
}

/**
 * Resolve placeholders in a list of volume mount strings.
 */
export function resolveVolumePlaceholders(volumes: string[], ctx: PlaceholderContext): string[] {
  return volumes.map(v => resolvePlaceholders(v, ctx));
}
