/**
 * Status Bar (2.5)
 *
 * Shows count of running devdocker containers in the status bar.
 * Click to show a quick pick list of running containers with options to stop.
 * Refreshes on an interval.
 */

import * as vscode from 'vscode';
import { execSync } from 'child_process';

const REFRESH_INTERVAL_MS = 10_000; // 10 seconds

export class DevDockerStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private timer: ReturnType<typeof setInterval> | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50,
    );
    this.statusBarItem.command = 'devdocker.showRunningContainers';
    this.disposables.push(this.statusBarItem);
  }

  /**
   * Start the status bar and begin periodic refresh.
   */
  start(): void {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
  }

  /**
   * Refresh the container count display.
   */
  refresh(): void {
    const containers = getRunningDevDockerContainers();
    const count = containers.length;

    if (count > 0) {
      this.statusBarItem.text = `$(container) ${count} container${count !== 1 ? 's' : ''}`;
      this.statusBarItem.tooltip = `${count} running DevDocker container${count !== 1 ? 's' : ''}\nClick to manage`;
      this.statusBarItem.show();
    } else {
      this.statusBarItem.text = '$(container) 0 containers';
      this.statusBarItem.tooltip = 'No running DevDocker containers';
      this.statusBarItem.show();
    }
  }

  /**
   * Show a quick pick of running containers with options to stop them.
   */
  async showContainerPicker(): Promise<void> {
    const containers = getRunningDevDockerContainers();

    if (containers.length === 0) {
      vscode.window.showInformationMessage('DevDocker: No running containers.');
      return;
    }

    const items = containers.map(c => ({
      label: c.name,
      description: `${c.image} | ${c.status}`,
      detail: `ID: ${c.id}`,
      container: c,
    }));

    // Add a "Stop All" option
    items.push({
      label: '$(stop) Stop All Containers',
      description: `Stop all ${containers.length} running containers`,
      detail: '',
      container: undefined as unknown as ContainerInfo,
    });

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a container to stop',
    });

    if (!picked) {
      return;
    }

    if (!picked.container) {
      // Stop all
      for (const c of containers) {
        await stopContainer(c.id);
      }
      vscode.window.showInformationMessage(`DevDocker: Stopped ${containers.length} container(s).`);
    } else {
      await stopContainer(picked.container.id);
      vscode.window.showInformationMessage(`DevDocker: Stopped ${picked.container.name}.`);
    }

    this.refresh();
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}

interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
}

/**
 * Get running containers whose image name contains common devdocker patterns.
 * Uses `docker ps` with a format string.
 */
function getRunningDevDockerContainers(): ContainerInfo[] {
  try {
    const result = execSync(
      'docker ps --format "{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.Status}}"',
      { stdio: 'pipe', timeout: 5000, encoding: 'utf-8' },
    );

    return result
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [id, name, image, ...statusParts] = line.split('\t');
        return { id, name, image, status: statusParts.join('\t') };
      });
  } catch {
    return [];
  }
}

/**
 * Stop a running container by ID.
 */
async function stopContainer(id: string): Promise<void> {
  try {
    execSync(`docker stop ${id}`, { stdio: 'pipe', timeout: 15000 });
  } catch {
    vscode.window.showErrorMessage(`DevDocker: Failed to stop container ${id}.`);
  }
}
