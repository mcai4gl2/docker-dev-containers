/**
 * devdocker.json Discovery
 *
 * Recursively scans the workspace for devdocker.json files, parses and
 * validates their task structure.
 *
 * Reference: tools/docker_common.py discover_devdocker_configs(), get_all_docker_tasks()
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/** A single task defined in a devdocker.json file */
export interface DevDockerTask {
  /** Task display name */
  name: string;
  /** Task type: "exec" or "shell" */
  type: 'exec' | 'shell';
  /** Docker image name (subdirectory under docker/) */
  image: string;
  /** Command to execute (required for exec tasks) */
  command?: string;
  /** Task description shown in UI */
  description?: string;
  /** Docker network mode override */
  network_mode?: string;
  /** Volume mounts override */
  volumes?: string[];
  /** Container working directory override */
  working_dir?: string;
  /** Run as current user (uid:gid) */
  run_as_user?: boolean;
  /** Environment variables */
  env?: Record<string, string>;
  /** Port mappings */
  ports?: string[];
}

/** A parsed devdocker.json config file */
export interface DevDockerConfig {
  /** Relative path to the devdocker.json file */
  relativePath: string;
  /** Absolute path to the devdocker.json file */
  absolutePath: string;
  /** Parsed tasks from the file */
  tasks: DevDockerTask[];
}

/** A task with its source file information */
export interface DevDockerTaskWithSource extends DevDockerTask {
  /** Relative path to the source devdocker.json file */
  sourceFile: string;
}

/** Directories to exclude when scanning */
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.vscode-test', 'out', 'dist']);

/**
 * Discover all devdocker.json files in the workspace.
 */
export function discoverDevDockerConfigs(workspaceFolder: vscode.WorkspaceFolder): DevDockerConfig[] {
  const configs: DevDockerConfig[] = [];
  const rootPath = workspaceFolder.uri.fsPath;

  scanDirectory(rootPath, rootPath, configs);

  return configs;
}

/**
 * Recursively scan a directory for devdocker.json files.
 */
function scanDirectory(dir: string, rootPath: string, configs: DevDockerConfig[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Skip excluded directories and hidden directories
      if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      scanDirectory(path.join(dir, entry.name), rootPath, configs);
    } else if (entry.name === 'devdocker.json') {
      const absolutePath = path.join(dir, entry.name);
      const config = parseDevDockerConfig(absolutePath, rootPath);
      if (config) {
        configs.push(config);
      }
    }
  }
}

/**
 * Parse and validate a devdocker.json file.
 */
function parseDevDockerConfig(absolutePath: string, rootPath: string): DevDockerConfig | null {
  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = JSON.parse(content);

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      return null;
    }

    const tasks: DevDockerTask[] = [];
    for (const rawTask of parsed.tasks) {
      if (!rawTask.name || !rawTask.image) {
        continue; // Skip tasks without required fields
      }

      tasks.push({
        name: rawTask.name,
        type: rawTask.type === 'shell' ? 'shell' : 'exec',
        image: rawTask.image,
        command: rawTask.command,
        description: rawTask.description ?? '',
        network_mode: rawTask.network_mode,
        volumes: rawTask.volumes,
        working_dir: rawTask.working_dir,
        run_as_user: rawTask.run_as_user,
        env: rawTask.env,
        ports: rawTask.ports,
      });
    }

    return {
      relativePath: path.relative(rootPath, absolutePath),
      absolutePath,
      tasks,
    };
  } catch {
    // Skip invalid or unreadable files
    return null;
  }
}

/**
 * Get all tasks from all discovered devdocker.json files, with source info.
 */
export function getAllDockerTasks(workspaceFolder: vscode.WorkspaceFolder): DevDockerTaskWithSource[] {
  const configs = discoverDevDockerConfigs(workspaceFolder);
  const allTasks: DevDockerTaskWithSource[] = [];

  for (const config of configs) {
    for (const task of config.tasks) {
      allTasks.push({
        ...task,
        sourceFile: config.relativePath,
      });
    }
  }

  return allTasks;
}
