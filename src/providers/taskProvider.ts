/**
 * Native Task Provider (2.1)
 *
 * Registers a VS Code TaskProvider for task type "devdocker".
 * Dynamically provides tasks from discovered images and devdocker.json files.
 * Also resolves manually defined tasks from tasks.json.
 */

import * as vscode from 'vscode';
import { DockerImage } from '../discovery/imageDiscovery';
import { DevDockerTaskWithSource } from '../discovery/taskDiscovery';

/**
 * Task definition for tasks.json manual customization.
 */
interface DevDockerTaskDefinition extends vscode.TaskDefinition {
  /** Task type - always "devdocker" */
  type: 'devdocker';
  /** Docker image name */
  image: string;
  /** Command to run (exec mode) */
  command?: string;
  /** Network mode override */
  networkMode?: string;
  /** "exec" or "shell" */
  taskType?: 'exec' | 'shell';
}

export class DevDockerTaskProvider implements vscode.TaskProvider {
  static readonly type = 'devdocker';

  private images: DockerImage[] = [];
  private devdockerTasks: DevDockerTaskWithSource[] = [];

  /**
   * Update the provider with the latest discovered data.
   */
  update(images: DockerImage[], tasks: DevDockerTaskWithSource[]): void {
    this.images = images;
    this.devdockerTasks = tasks;
  }

  /**
   * Provide dynamic tasks that appear in "Tasks: Run Task".
   */
  provideTasks(_token: vscode.CancellationToken): vscode.Task[] {
    const tasks: vscode.Task[] = [];

    // ── Build All Images ──────────────────────────────────────────────
    if (this.images.length > 0) {
      tasks.push(this.createBuildAllTask());
    }

    // ── Per-image tasks ───────────────────────────────────────────────
    for (const image of this.images) {
      // Build task for every image (including base)
      tasks.push(this.createBuildTask(image));

      // Shell task for non-base images
      if (image.name !== 'base') {
        tasks.push(this.createShellTask(image));
      }
    }

    // ── devdocker.json tasks ──────────────────────────────────────────
    for (const ddTask of this.devdockerTasks) {
      tasks.push(this.createDevDockerTask(ddTask));
    }

    return tasks;
  }

  /**
   * Resolve a task from tasks.json that the user defined manually.
   */
  resolveTask(task: vscode.Task, _token: vscode.CancellationToken): vscode.Task | undefined {
    const definition = task.definition as DevDockerTaskDefinition;
    if (!definition.image) {
      return undefined;
    }

    const image = this.images.find(i => i.name === definition.image);
    if (!image) {
      return undefined;
    }

    const taskType = definition.taskType ?? (definition.command ? 'exec' : 'shell');

    if (taskType === 'shell') {
      // Shell tasks use the terminal
      return this.createResolvedShellTask(task, image, definition);
    } else {
      // Exec tasks run a command
      return this.createResolvedExecTask(task, image, definition);
    }
  }

  // ── Factory methods ──────────────────────────────────────────────────

  private createBuildAllTask(): vscode.Task {
    const definition: DevDockerTaskDefinition = { type: 'devdocker', image: '*' };
    const task = new vscode.Task(
      definition,
      vscode.TaskScope.Workspace,
      'Build All Images',
      'DevDocker',
      new vscode.ShellExecution('echo "Building via DevDocker extension..." && exit 0'),
    );
    task.group = vscode.TaskGroup.Build;
    task.detail = 'Build all discovered Docker images in dependency order';
    // The actual build is dispatched through the command
    task.execution = new vscode.ShellExecution(
      '${command:devdocker.buildAll}',
    );
    return task;
  }

  private createBuildTask(image: DockerImage): vscode.Task {
    const definition: DevDockerTaskDefinition = { type: 'devdocker', image: image.name };
    const task = new vscode.Task(
      definition,
      vscode.TaskScope.Workspace,
      `Build ${image.name}`,
      'DevDocker',
      new vscode.ShellExecution(`docker build -t ${image.tag} ${image.path}`),
    );
    task.group = vscode.TaskGroup.Build;
    task.detail = image.description;
    return task;
  }

  private createShellTask(image: DockerImage): vscode.Task {
    const definition: DevDockerTaskDefinition = {
      type: 'devdocker',
      image: image.name,
      taskType: 'shell',
    };
    const task = new vscode.Task(
      definition,
      vscode.TaskScope.Workspace,
      `${image.name} Shell`,
      'DevDocker',
      // Shell tasks are handled by the command which uses Terminal API
      new vscode.ShellExecution('${command:devdocker.shell}'),
    );
    task.detail = `Interactive shell in ${image.name} container`;
    task.presentationOptions = { reveal: vscode.TaskRevealKind.Always };
    return task;
  }

  private createDevDockerTask(ddTask: DevDockerTaskWithSource): vscode.Task {
    const definition: DevDockerTaskDefinition = {
      type: 'devdocker',
      image: ddTask.image,
      command: ddTask.command,
      taskType: ddTask.type,
    };

    let execution: vscode.ShellExecution;
    if (ddTask.type === 'exec' && ddTask.command) {
      // Build a real docker run command for exec tasks
      execution = new vscode.ShellExecution(
        this.buildDockerRunShellCommand(ddTask),
      );
    } else {
      // Shell tasks dispatch through the command
      execution = new vscode.ShellExecution('${command:devdocker.runTask}');
    }

    const task = new vscode.Task(
      definition,
      vscode.TaskScope.Workspace,
      ddTask.name,
      'DevDocker',
      execution,
    );
    task.detail = ddTask.description
      ? `${ddTask.description} (from ${ddTask.sourceFile})`
      : `From ${ddTask.sourceFile}`;
    return task;
  }

  private createResolvedShellTask(
    task: vscode.Task,
    image: DockerImage,
    definition: DevDockerTaskDefinition,
  ): vscode.Task {
    const resolved = new vscode.Task(
      definition,
      task.scope ?? vscode.TaskScope.Workspace,
      task.name,
      'DevDocker',
      new vscode.ShellExecution('${command:devdocker.shell}'),
    );
    resolved.detail = `Interactive shell in ${image.name}`;
    return resolved;
  }

  private createResolvedExecTask(
    task: vscode.Task,
    image: DockerImage,
    definition: DevDockerTaskDefinition,
  ): vscode.Task {
    const networkFlag = definition.networkMode ? `--network ${definition.networkMode}` : '--network host';
    const cmd = definition.command ?? 'echo "No command specified"';

    const resolved = new vscode.Task(
      definition,
      task.scope ?? vscode.TaskScope.Workspace,
      task.name,
      'DevDocker',
      new vscode.ShellExecution(
        `docker run --rm ${networkFlag} -w /workspace -v "\${workspaceFolder}:/workspace" ${image.tag} sh -c '${cmd.replace(/'/g, "'\\''")}'`,
      ),
    );
    resolved.detail = `Run: ${cmd}`;
    return resolved;
  }

  /**
   * Build a docker run shell command string for an exec task.
   */
  private buildDockerRunShellCommand(ddTask: DevDockerTaskWithSource): string {
    const image = this.images.find(i => i.name === ddTask.image);
    const imageTag = image?.tag ?? ddTask.image;
    const networkMode = ddTask.network_mode ?? 'host';
    const workingDir = ddTask.working_dir ?? '/workspace';
    const command = ddTask.command ?? '';

    let cmd = `docker run --rm --network ${networkMode} -w ${workingDir}`;
    cmd += ` -v "\${workspaceFolder}:/workspace"`;

    if (ddTask.env) {
      for (const [key, value] of Object.entries(ddTask.env)) {
        cmd += ` -e ${key}=${value}`;
      }
    }

    if (ddTask.ports && ddTask.ports.length > 0 && networkMode !== 'host') {
      for (const port of ddTask.ports) {
        cmd += ` -p ${port}`;
      }
    }

    cmd += ` ${imageTag} sh -c '${command.replace(/'/g, "'\\''")}'`;
    return cmd;
  }
}
