/**
 * Docker CLI Wrapper
 *
 * Thin wrapper around the Docker CLI using child_process.
 * Works with any Docker-compatible CLI (Docker, Podman).
 */

import { spawn, execSync, SpawnOptions } from 'child_process';
import * as vscode from 'vscode';

/**
 * Check if the docker command is available.
 */
export function isDockerAvailable(): boolean {
  try {
    execSync('docker --version', { stdio: 'pipe', timeout: 5000 });
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
    const result = execSync('docker images --format "{{.Repository}}:{{.Tag}}"', {
      stdio: 'pipe',
      timeout: 10000,
      encoding: 'utf-8',
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
    let cmd = 'docker ps --format "{{.Names}}"';
    if (labelFilter) {
      cmd += ` --filter "label=${labelFilter}"`;
    }
    const result = execSync(cmd, { stdio: 'pipe', timeout: 10000, encoding: 'utf-8' });
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

    const proc = spawn('docker', args, {
      cwd: options?.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
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
