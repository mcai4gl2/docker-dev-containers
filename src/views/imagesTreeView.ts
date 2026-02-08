/**
 * Images TreeView (2.2)
 *
 * Activity bar sidebar panel listing discovered Docker images as tree items.
 * Child nodes show detected tools. Context menu: Build, Shell, Rebuild, Copy Tag.
 * Icons: built (green check) vs not built (gray).
 */

import * as vscode from 'vscode';
import { DockerImage } from '../discovery/imageDiscovery';
import { imageExists } from '../docker/dockerClient';

/** Types of tree items in the images view */
type ImageTreeItemType = 'image' | 'tool';

export class ImagesTreeDataProvider implements vscode.TreeDataProvider<ImageTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ImageTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private images: DockerImage[] = [];

  update(images: DockerImage[]): void {
    this.images = images;
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ImageTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ImageTreeItem): ImageTreeItem[] {
    if (!element) {
      // Root level: list images
      return this.images.map(img => {
        const built = imageExists(img.tag);
        const item = new ImageTreeItem(
          img.name,
          'image',
          img.tools.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          img,
        );
        item.description = img.tag;
        item.tooltip = `${img.description}\nTag: ${img.tag}\nTools: ${img.tools.join(', ') || 'none'}`;
        item.iconPath = new vscode.ThemeIcon(
          built ? 'pass-filled' : 'circle-large-outline',
          built
            ? new vscode.ThemeColor('testing.iconPassed')
            : new vscode.ThemeColor('disabledForeground'),
        );
        item.contextValue = img.name === 'base' ? 'devdocker-image-base' : 'devdocker-image';
        return item;
      });
    }

    if (element.itemType === 'image' && element.image) {
      // Child level: list tools
      return element.image.tools.map(tool => {
        const item = new ImageTreeItem(
          tool,
          'tool',
          vscode.TreeItemCollapsibleState.None,
        );
        item.iconPath = new vscode.ThemeIcon('tools');
        item.contextValue = 'devdocker-tool';
        return item;
      });
    }

    return [];
  }
}

export class ImageTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: ImageTreeItemType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly image?: DockerImage,
  ) {
    super(label, collapsibleState);
  }
}
