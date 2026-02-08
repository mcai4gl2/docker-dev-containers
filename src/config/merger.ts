/**
 * Settings Merger
 *
 * Merges layered configuration: VS Code settings (global defaults) ->
 * devdocker.json task overrides -> user CLI overrides.
 *
 * Reference: tools/docker_common.py merge_task_settings()
 */

import { DockerDefaults } from './defaults';
import { getSettingsDefaults } from './settings';
import { DevDockerTask } from '../discovery/taskDiscovery';

/** Fully resolved settings for running a container */
export interface ResolvedContainerSettings {
  networkMode: string;
  runAsUser: boolean;
  volumes: string[];
  workingDir: string;
  ports: string[];
  env: Record<string, string>;
}

/**
 * Merge task-specific settings with VS Code settings defaults.
 *
 * Task-specific settings (from devdocker.json) override VS Code defaults.
 * Any field not specified in the task falls back to the VS Code setting.
 */
export function mergeTaskSettings(
  task: DevDockerTask,
  overrides?: Partial<ResolvedContainerSettings>,
): ResolvedContainerSettings {
  const defaults = getSettingsDefaults();

  const merged: ResolvedContainerSettings = {
    networkMode: task.network_mode ?? defaults.networkMode,
    runAsUser: task.run_as_user ?? defaults.runAsUser,
    volumes: task.volumes ?? defaults.volumes,
    workingDir: task.working_dir ?? defaults.workingDir,
    ports: task.ports ?? defaults.ports,
    env: task.env ?? {},
  };

  // Apply user overrides (e.g., from command palette inputs)
  if (overrides) {
    if (overrides.networkMode !== undefined) { merged.networkMode = overrides.networkMode; }
    if (overrides.runAsUser !== undefined) { merged.runAsUser = overrides.runAsUser; }
    if (overrides.volumes !== undefined) { merged.volumes = overrides.volumes; }
    if (overrides.workingDir !== undefined) { merged.workingDir = overrides.workingDir; }
    if (overrides.ports !== undefined) { merged.ports = overrides.ports; }
    if (overrides.env !== undefined) { merged.env = { ...merged.env, ...overrides.env }; }
  }

  return merged;
}

/**
 * Create resolved settings from defaults only (no task overrides).
 * Used for ad-hoc shell/exec commands that aren't from devdocker.json.
 */
export function getDefaultContainerSettings(): ResolvedContainerSettings {
  const defaults = getSettingsDefaults();
  return {
    networkMode: defaults.networkMode,
    runAsUser: defaults.runAsUser,
    volumes: defaults.volumes,
    workingDir: defaults.workingDir,
    ports: defaults.ports,
    env: {},
  };
}
