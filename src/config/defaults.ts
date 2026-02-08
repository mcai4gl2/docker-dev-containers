/**
 * Default settings for DevDocker.
 *
 * These are the hardcoded fallback defaults used when no VS Code setting
 * or devdocker.json override is provided.
 */

export interface DockerDefaults {
  networkMode: string;
  runAsUser: boolean;
  volumes: string[];
  workingDir: string;
  ports: string[];
}

export const DEFAULT_SETTINGS: DockerDefaults = {
  networkMode: 'host',
  runAsUser: true,
  volumes: ['{workspaceFolder}:/workspace'],
  workingDir: '/workspace',
  ports: [],
};
