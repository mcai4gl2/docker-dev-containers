/**
 * Container Runner
 *
 * Runs containers in exec mode (docker run --rm) or shell mode
 * (VS Code Terminal API with docker run --rm -it).
 *
 * Reference: tools/docker_exec.py, tools/docker_shell.py
 */

import * as vscode from 'vscode';
import { DockerImage } from '../discovery/imageDiscovery';
import { DevDockerTask } from '../discovery/taskDiscovery';
import { ResolvedContainerSettings, mergeTaskSettings, getDefaultContainerSettings } from '../config/merger';
import { resolveVolumePlaceholders, resolvePlaceholders } from '../utils/placeholder';
import { getUidGid } from '../utils/platform';
import { isInDevcontainer, getDevcontainerInfo, adjustVolumeForDevcontainer } from './devcontainer';
import { runDockerCommand, isDockerAvailable } from './dockerClient';
import { ensureImageBuilt } from './imageBuilder';

/**
 * Build the docker run argument list from resolved settings.
 */
function buildDockerRunArgs(
  imageTag: string,
  settings: ResolvedContainerSettings,
  workspacePath: string,
  mode: 'exec' | 'shell',
  command?: string,
): string[] {
  const args: string[] = ['run', '--rm'];

  // Interactive mode for shell
  if (mode === 'shell') {
    args.push('-it');
  }

  // Network
  args.push('--network', settings.networkMode);

  // Working directory
  args.push('-w', settings.workingDir);

  // User mapping
  if (settings.runAsUser) {
    args.push('-u', getUidGid());
  }

  // Port mappings (only when not host networking)
  if (settings.ports.length > 0 && settings.networkMode !== 'host') {
    for (const port of settings.ports) {
      args.push('-p', port);
    }
  }

  // Volumes - resolve placeholders then adjust for devcontainer
  let resolvedVolumes = resolveVolumePlaceholders(settings.volumes, { workspaceFolder: workspacePath });

  if (isInDevcontainer()) {
    const devInfo = getDevcontainerInfo(workspacePath);
    resolvedVolumes = resolvedVolumes.map(v => adjustVolumeForDevcontainer(v, devInfo));
  }

  for (const vol of resolvedVolumes) {
    args.push('-v', vol);
  }

  // Environment variables - resolve ${VAR} references
  for (const [key, value] of Object.entries(settings.env)) {
    const resolvedValue = resolvePlaceholders(value, { workspaceFolder: workspacePath });
    args.push('-e', `${key}=${resolvedValue}`);
  }

  // Image
  args.push(imageTag);

  // Command (for exec mode or custom shell command)
  if (command) {
    // Split command string into shell execution via sh -c
    args.push('sh', '-c', command);
  } else if (mode === 'shell') {
    args.push('/bin/bash');
  }

  return args;
}

/**
 * Execute a command in a container (exec mode).
 *
 * Runs docker run --rm and streams output to the Output Channel.
 */
export async function execInContainer(
  image: DockerImage,
  allImages: DockerImage[],
  command: string,
  settings: ResolvedContainerSettings,
  workspacePath: string,
  outputChannel: vscode.OutputChannel,
): Promise<boolean> {
  // Verify docker is available
  if (!isDockerAvailable()) {
    vscode.window.showErrorMessage('DevDocker: Docker command not found. Please install Docker.');
    return false;
  }

  // Ensure image is built
  const available = await ensureImageBuilt(image, allImages, outputChannel);
  if (!available) {
    return false;
  }

  const args = buildDockerRunArgs(image.tag, settings, workspacePath, 'exec', command);

  outputChannel.appendLine(`Executing in ${image.name}: ${command}`);
  if (isInDevcontainer()) {
    outputChannel.appendLine('  Environment: Devcontainer (docker-from-docker)');
  }
  outputChannel.appendLine('');
  outputChannel.show(true);

  const exitCode = await runDockerCommand(args, outputChannel);
  outputChannel.appendLine(`\nExit code: ${exitCode}`);

  return exitCode === 0;
}

/**
 * Open an interactive shell in a container (shell mode).
 *
 * Uses the VS Code Terminal API for native terminal experience.
 */
export async function shellInContainer(
  image: DockerImage,
  allImages: DockerImage[],
  settings: ResolvedContainerSettings,
  workspacePath: string,
  outputChannel: vscode.OutputChannel,
  terminalName?: string,
): Promise<vscode.Terminal | undefined> {
  // Verify docker is available
  if (!isDockerAvailable()) {
    vscode.window.showErrorMessage('DevDocker: Docker command not found. Please install Docker.');
    return undefined;
  }

  // Ensure image is built
  const available = await ensureImageBuilt(image, allImages, outputChannel);
  if (!available) {
    return undefined;
  }

  const args = buildDockerRunArgs(image.tag, settings, workspacePath, 'shell');

  // Terminal API: shellPath is the executable, shellArgs are all arguments.
  // args = ['run', '--rm', '-it', '--network', ..., 'image', '/bin/bash']
  const terminal = vscode.window.createTerminal({
    name: terminalName ?? `DevDocker: ${image.name}`,
    shellPath: 'docker',
    shellArgs: args,
  });

  terminal.show();
  return terminal;
}

/**
 * Run a devdocker.json task.
 */
export async function runTask(
  task: DevDockerTask,
  image: DockerImage,
  allImages: DockerImage[],
  workspacePath: string,
  outputChannel: vscode.OutputChannel,
): Promise<boolean | vscode.Terminal | undefined> {
  const settings = mergeTaskSettings(task);

  if (task.type === 'shell') {
    return shellInContainer(
      image, allImages, settings, workspacePath, outputChannel,
      `DevDocker: ${task.name}`,
    );
  } else {
    if (!task.command) {
      vscode.window.showErrorMessage(`DevDocker: Task "${task.name}" is an exec task but has no command.`);
      return false;
    }
    return execInContainer(image, allImages, task.command, settings, workspacePath, outputChannel);
  }
}
