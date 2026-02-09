/**
 * Docker CLI Wrapper
 *
 * Thin wrapper around the Docker CLI using child_process.
 * Works with any Docker-compatible CLI (Docker, Podman).
 */

import { spawn, execSync, SpawnOptions } from 'child_process';
import * as vscode from 'vscode';

/**
 * Get environment variables for Docker commands, including DOCKER_HOST if configured.
 * Returns a clean record of strings for compatibility with VS Code APIs.
 */
export function getDockerEnv(): { [key: string]: string } {
  const config = vscode.workspace.getConfiguration('devdocker');
  const host = config.get<string>('dockerHost', '');
  const env: { [key: string]: string } = {};

  // Copy current process environment, ensuring only strings are included
  for (const key in process.env) {
    const value = process.env[key];
    if (value !== undefined) {
      env[key] = value;
    }
  }

  if (host) {
    env.DOCKER_HOST = host;
  }
  return env;
}

/**
 * Check if the docker command is available and the daemon is reachable.
 */
export function isDockerAvailable(): boolean {
  try {
    const env = getDockerEnv();
    // Check if CLI exists
    execSync('docker --version', { stdio: 'pipe', timeout: 5000, env });
    // Check if daemon is reachable
    execSync('docker info', { stdio: 'pipe', timeout: 10000, env });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a Docker image exists locally.
 */
export function imageExists(imageTag: string): boolean {
  try {
    const env = getDockerEnv();
    const result = execSync('docker images --format "{{.Repository}}:{{.Tag}}"', {
      stdio: 'pipe',
      timeout: 10000,
      encoding: 'utf-8',
      env,
    });
    const images = result.split('\n').map(l => l.trim());
    return images.includes(imageTag);
  } catch {
    return false;
  }
}

/**
 * Get list of running containers matching a label filter.
 */
export function getRunningContainers(labelFilter?: string): string[] {
  try {
    const env = getDockerEnv();
    let cmd = 'docker ps --format "{{.Names}}"';
    if (labelFilter) {
      cmd += ` --filter "label=${labelFilter}"`;
    }
    const result = execSync(cmd, { stdio: 'pipe', timeout: 10000, encoding: 'utf-8', env });
    return result.split('\n').map(l => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export interface DockerRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Run a docker command and stream output to an OutputChannel.
 *
 * Returns a promise that resolves when the command exits.
 */
export function runDockerCommand(
  args: string[],
  outputChannel: vscode.OutputChannel,
  options?: { cwd?: string },
): Promise<number> {
  return new Promise((resolve) => {
    outputChannel.appendLine(`> docker ${args.join(' ')}`);
    outputChannel.appendLine('');

    const env = getDockerEnv();
    const proc = spawn('docker', args, {
      cwd: options?.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env,
    });

    proc.stdout?.on('data', (data: Buffer) => {
      outputChannel.append(data.toString());
    });

    proc.stderr?.on('data', (data: Buffer) => {
      outputChannel.append(data.toString());
    });

    proc.on('close', (code) => {
      resolve(code ?? 1);
    });

    proc.on('error', (err) => {
      outputChannel.appendLine(`Error: ${err.message}`);
      resolve(1);
    });
  });
}
