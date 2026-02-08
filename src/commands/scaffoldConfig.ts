/**
 * Scaffold devdocker.json Command (3.1)
 *
 * Command palette: DevDocker: Create devdocker.json
 * - Quick pick to select image from discovered images
 * - Choose task type (exec or shell)
 * - Generates template devdocker.json in the current directory
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DockerImage } from '../discovery/imageDiscovery';

/**
 * Run the scaffold command. Prompts for image and task type, then writes
 * a template devdocker.json into the chosen directory.
 */
export async function scaffoldDevDockerConfig(
  images: DockerImage[],
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('DevDocker: No workspace folder open.');
    return;
  }

  // 1. Pick image
  const nonBaseImages = images.filter(i => i.name !== 'base');
  if (nonBaseImages.length === 0) {
    vscode.window.showWarningMessage(
      'DevDocker: No Docker images found. Create a Docker image first.',
    );
    return;
  }

  const imageItems = nonBaseImages.map(img => ({
    label: img.name,
    description: img.tag,
    detail: img.description,
  }));

  const pickedImage = await vscode.window.showQuickPick(imageItems, {
    placeHolder: 'Select a Docker image for the task',
  });
  if (!pickedImage) { return; }

  // 2. Pick task type
  const taskType = await vscode.window.showQuickPick(
    [
      { label: 'exec', description: 'Run a command and exit' },
      { label: 'shell', description: 'Open an interactive terminal' },
    ],
    { placeHolder: 'Select task type' },
  );
  if (!taskType) { return; }

  // 3. Ask for task name
  const taskName = await vscode.window.showInputBox({
    prompt: 'Task name',
    placeHolder: 'e.g., Test gRPC Service',
    value: taskType.label === 'shell'
      ? `${pickedImage.label} Shell`
      : `Run ${pickedImage.label}`,
  });
  if (!taskName) { return; }

  // 4. For exec tasks, ask for the command
  let command: string | undefined;
  if (taskType.label === 'exec') {
    command = await vscode.window.showInputBox({
      prompt: 'Command to execute in the container',
      placeHolder: 'e.g., grpcurl -plaintext localhost:50051 list',
    });
    if (!command) { return; }
  }

  // 5. Pick target directory
  const targetDir = await pickTargetDirectory(workspaceFolder.uri.fsPath);
  if (!targetDir) { return; }

  // 6. Generate the file
  const filePath = path.join(targetDir, 'devdocker.json');

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    const overwrite = await vscode.window.showWarningMessage(
      `devdocker.json already exists in ${path.relative(workspaceFolder.uri.fsPath, targetDir)}. Add task to existing file?`,
      'Add Task',
      'Cancel',
    );
    if (overwrite === 'Add Task') {
      await addTaskToExistingConfig(filePath, pickedImage.label, taskType.label, taskName, command);
      return;
    }
    return;
  }

  const content = generateDevDockerJson(pickedImage.label, taskType.label, taskName, command);

  fs.writeFileSync(filePath, content, 'utf-8');

  // Open the file in the editor
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);

  vscode.window.showInformationMessage(
    `DevDocker: Created ${path.relative(workspaceFolder.uri.fsPath, filePath)}`,
  );
}

/**
 * Let the user pick a directory within the workspace for the new file.
 */
async function pickTargetDirectory(workspaceRoot: string): Promise<string | undefined> {
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(workspaceRoot),
    openLabel: 'Select directory for devdocker.json',
  });

  if (!uris || uris.length === 0) {
    return undefined;
  }

  return uris[0].fsPath;
}

/**
 * Generate a devdocker.json file content.
 */
function generateDevDockerJson(
  imageName: string,
  taskType: string,
  taskName: string,
  command?: string,
): string {
  const task: Record<string, unknown> = {
    name: taskName,
    type: taskType,
    image: imageName,
  };

  if (taskType === 'exec' && command) {
    task.command = command;
  }

  task.description = '';

  const config = {
    $schema: './node_modules/devdocker/schemas/devdocker.schema.json',
    tasks: [task],
  };

  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * Add a task to an existing devdocker.json file.
 */
async function addTaskToExistingConfig(
  filePath: string,
  imageName: string,
  taskType: string,
  taskName: string,
  command?: string,
): Promise<void> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content);

    if (!config.tasks || !Array.isArray(config.tasks)) {
      config.tasks = [];
    }

    const newTask: Record<string, unknown> = {
      name: taskName,
      type: taskType,
      image: imageName,
    };

    if (taskType === 'exec' && command) {
      newTask.command = command;
    }

    newTask.description = '';

    config.tasks.push(newTask);

    fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
      `DevDocker: Added task "${taskName}" to ${path.basename(path.dirname(filePath))}/devdocker.json`,
    );
  } catch (err) {
    vscode.window.showErrorMessage(`DevDocker: Failed to update devdocker.json: ${err}`);
  }
}
