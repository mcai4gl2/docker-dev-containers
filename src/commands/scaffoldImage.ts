/**
 * Scaffold Docker Image Command (3.2)
 *
 * Command: DevDocker: Create Docker Image
 * - Prompt for image name
 * - Creates docker/<name>/Dockerfile from template
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getImagePrefix } from '../discovery/imageDiscovery';
import { getDockerDirectory } from '../config/settings';

/**
 * Run the scaffold command. Prompts for name, then creates a Dockerfile
 * in docker/<name>/.
 */
export async function scaffoldDockerImage(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('DevDocker: No workspace folder open.');
    return;
  }

  // 1. Ask for image name
  const imageName = await vscode.window.showInputBox({
    prompt: 'Docker image name (lowercase, hyphens ok)',
    placeHolder: 'e.g., grpc-tools',
    validateInput: (value) => {
      if (!value) { return 'Name is required'; }
      if (!/^[a-z][a-z0-9-]*$/.test(value)) {
        return 'Name must start with a letter and contain only lowercase letters, digits, and hyphens';
      }
      return undefined;
    },
  });
  if (!imageName) { return; }

  // 2. Check if it already exists
  const dockerDir = getDockerDirectory();
  const imageDir = path.join(workspaceFolder.uri.fsPath, dockerDir, imageName);

  if (fs.existsSync(imageDir)) {
    vscode.window.showErrorMessage(
      `DevDocker: Directory ${dockerDir}/${imageName} already exists.`,
    );
    return;
  }

  // 3. Ask what kind of tools to install (optional hint)
  const toolHint = await vscode.window.showInputBox({
    prompt: 'Tools to install (space-separated, or leave blank to fill in later)',
    placeHolder: 'e.g., curl jq httpie',
  });

  // 4. Generate the Dockerfile
  const prefix = getImagePrefix(workspaceFolder);
  const tools = toolHint ? toolHint.trim().split(/\s+/) : ['your-tool-here'];
  const toolsList = tools.map(t => `    ${t}`).join(' \\\n');

  const dockerfile = generateDockerfile(imageName, prefix, toolsList);

  // 5. Create directory and write file
  fs.mkdirSync(imageDir, { recursive: true });
  const dockerfilePath = path.join(imageDir, 'Dockerfile');
  fs.writeFileSync(dockerfilePath, dockerfile, 'utf-8');

  // 6. Open the Dockerfile in editor
  const doc = await vscode.workspace.openTextDocument(dockerfilePath);
  await vscode.window.showTextDocument(doc);

  vscode.window.showInformationMessage(
    `DevDocker: Created ${dockerDir}/${imageName}/Dockerfile`,
  );
}

/**
 * Generate a Dockerfile from template.
 */
function generateDockerfile(
  imageName: string,
  prefix: string,
  toolsList: string,
): string {
  return `# ${imageName} development tools container
ARG BASE_IMAGE=${prefix}-base:latest
FROM \${BASE_IMAGE}

# Install tools
RUN apt-get update && apt-get install -y \\
${toolsList} \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
CMD ["/bin/bash"]
`;
}
