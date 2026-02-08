/**
 * Extract metadata from Dockerfile comments and install commands.
 *
 * Mirrors the logic from tools/docker_common.py extract_dockerfile_metadata().
 */

export interface DockerfileMetadata {
  description: string | null;
  tools: string[];
}

/** Packages to ignore when extracting tools from apt-get install */
const APT_IGNORE = new Set([
  'software-properties-common', 'build-essential', 'ca-certificates',
  'gnupg', 'lsb-release', 'python3', 'python3-pip', 'python3-venv',
  'python3-dev', 'python3.11', 'python3.11-venv', 'python3.11-dev',
]);

/** Packages to ignore when extracting tools from pip install */
const PIP_IGNORE = new Set([
  '--no-cache-dir', '--upgrade', 'pip', 'setuptools', 'wheel',
]);

/** Common tool binary names to look for in Dockerfile content */
const COMMON_TOOLS = [
  'grpcurl', 'grpcui', 'buf', 'protoc', 'jq', 'yq', 'curl',
  'httpie', 'node', 'npx', 'python', 'uv', 'nmap', 'telnet',
];

/**
 * Extract metadata from Dockerfile content.
 *
 * Looks for:
 * - Description: first comment line containing "container"
 * - Tools: regex patterns for go install, apt-get install, pip install,
 *   npm install -g, and common tool binary names
 */
export function extractDockerfileMetadata(content: string): DockerfileMetadata {
  const metadata: DockerfileMetadata = {
    description: null,
    tools: [],
  };

  const lines = content.split('\n');
  const tools = new Set<string>();

  // Extract description from first 10 lines
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') && trimmed.toLowerCase().includes('container')) {
      const desc = trimmed.replace(/^#+\s*/, '');
      if (desc && !desc.startsWith('!')) {
        metadata.description = desc;
        break;
      }
    }
  }

  // Pattern 1: go install github.com/.../toolname@version
  const goInstallRe = /go install .*\/([^/@\s]+)@/g;
  let match;
  while ((match = goInstallRe.exec(content)) !== null) {
    tools.add(match[1]);
  }

  // Pattern 2: apt-get install -y tool1 tool2
  const aptRe = /apt-get install.*?-y\s+(.*?)(?:&&|\\|\n)/gm;
  while ((match = aptRe.exec(content)) !== null) {
    const packages = match[1].trim().split(/\s+/);
    for (const pkg of packages) {
      if (pkg && !APT_IGNORE.has(pkg)) {
        tools.add(pkg);
      }
    }
  }

  // Pattern 3: pip install tool
  const pipRe = /pip3? install.*?\s+([a-z][a-z0-9_-]+)/g;
  while ((match = pipRe.exec(content)) !== null) {
    const tool = match[1];
    if (!PIP_IGNORE.has(tool)) {
      tools.add(tool);
    }
  }

  // Pattern 4: npm install -g @package/tool or tool
  const npmRe = /npm install -g\s+(@[^/]+\/[^\s]+|[^\s]+)/g;
  while ((match = npmRe.exec(content)) !== null) {
    tools.add(match[1]);
  }

  // Pattern 5: Common binaries
  const contentLower = content.toLowerCase();
  for (const tool of COMMON_TOOLS) {
    if (contentLower.includes(tool)) {
      tools.add(tool);
    }
  }

  metadata.tools = Array.from(tools).sort();
  return metadata;
}
