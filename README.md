# DevDocker - Docker Development Tools

Define, build, and run Docker-based development tool containers directly from VS Code. Drop a Dockerfile, add a `devdocker.json`, and go.

## Features

- **Image Discovery** -- automatically discovers Dockerfiles under your `docker/` directory and extracts tool metadata
- **Task System** -- define exec and shell tasks in `devdocker.json` with full JSON Schema validation and IntelliSense
- **Sidebar TreeView** -- browse discovered images and tasks from a dedicated activity bar panel
- **CodeLens** -- run/shell buttons appear inline above each task in `devdocker.json`
- **Terminal Profiles** -- open interactive container shells from the VS Code terminal dropdown
- **Task Provider** -- tasks appear in VS Code's built-in task runner (Terminal > Run Task)
- **Status Bar** -- shows the count of running DevDocker containers with quick-stop access
- **Scaffold Wizards** -- generate new `devdocker.json` configs and Dockerfile templates via command palette
- **Multi-root Workspace** -- works across multiple workspace folders with automatic disambiguation
- **Devcontainer Support** -- docker-from-docker volume remapping when running inside a VS Code devcontainer

## Getting Started

### Prerequisites

- Docker installed and available on your `PATH`
- VS Code 1.85 or later

### 1. Add a Dockerfile

Create a `docker/` directory in your workspace and add a Dockerfile:

```
my-project/
  docker/
    grpc-tools/
      Dockerfile
```

```dockerfile
# gRPC development tools container
FROM golang:1.21 AS builder
RUN go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

FROM ubuntu:22.04
COPY --from=builder /go/bin/grpcurl /usr/local/bin/
WORKDIR /workspace
CMD ["/bin/bash"]
```

### 2. Define tasks

Create a `devdocker.json` in any project directory:

```json
{
  "tasks": [
    {
      "name": "List gRPC services",
      "type": "exec",
      "image": "grpc-tools",
      "command": "grpcurl -plaintext localhost:50051 list"
    },
    {
      "name": "gRPC shell",
      "type": "shell",
      "image": "grpc-tools"
    }
  ]
}
```

### 3. Build and run

Open the command palette (`Ctrl+Shift+P`) and use:

- **DevDocker: Build All Images** -- build every image under `docker/`
- **DevDocker: Run Task** -- pick a task from your `devdocker.json` files
- **DevDocker: Open Shell** -- open an interactive terminal in a container

Or use the sidebar, CodeLens, or terminal profiles.

## Task Configuration

Each task in `devdocker.json` supports these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Task display name |
| `type` | `"exec"` \| `"shell"` | no | `exec` runs a command and exits, `shell` opens a terminal. Default: `exec` |
| `image` | string | yes | Docker image name (subdirectory name under `docker/`) |
| `command` | string | exec only | Command to execute in the container |
| `description` | string | no | Description shown in the UI |
| `network_mode` | `"host"` \| `"bridge"` \| `"none"` | no | Docker network mode |
| `volumes` | string[] | no | Volume mounts (supports `{workspaceFolder}` and `{project_root}` placeholders) |
| `working_dir` | string | no | Container working directory |
| `run_as_user` | boolean | no | Run as current user (uid:gid) |
| `env` | object | no | Environment variables (`${VAR}` resolved from host) |
| `ports` | string[] | no | Port mappings, e.g. `["8080:8080"]` |

## Commands

| Command | Description |
|---------|-------------|
| DevDocker: Build All Images | Build every Dockerfile under `docker/` |
| DevDocker: Build Image | Pick and build a single image |
| DevDocker: Run Task | Pick and run a task from `devdocker.json` |
| DevDocker: Open Shell | Open an interactive shell in a container |
| DevDocker: Run Command | Run an ad-hoc command in a container |
| DevDocker: Show Running Containers | List and stop running DevDocker containers |
| DevDocker: Create devdocker.json | Scaffold a new config file via wizard |
| DevDocker: Create Docker Image | Scaffold a new Dockerfile template |
| DevDocker: Refresh | Re-scan the workspace for images and tasks |

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `devdocker.dockerDirectory` | `"docker"` | Path to Docker images directory (relative to workspace root) |
| `devdocker.defaults.networkMode` | `"host"` | Default Docker network mode |
| `devdocker.defaults.runAsUser` | `true` | Run containers as current user (uid:gid) |
| `devdocker.defaults.volumes` | `["{workspaceFolder}:/workspace"]` | Default volume mounts |
| `devdocker.defaults.workingDir` | `"/workspace"` | Default container working directory |
| `devdocker.defaults.ports` | `[]` | Default port mappings |
| `devdocker.imagePrefix` | `""` | Image tag prefix (defaults to workspace folder name) |
| `devdocker.ghcrRegistry` | `""` | GHCR registry path for `--cache-from` support |

Settings can be overridden per-task in `devdocker.json`.

## Configuration Layering

Settings are resolved in order of precedence (highest wins):

1. **Task-level** -- fields set directly in `devdocker.json` task
2. **VS Code settings** -- `devdocker.defaults.*` in your settings.json
3. **Built-in defaults** -- hardcoded fallbacks

## Devcontainer Support

When running inside a VS Code devcontainer with docker-from-docker, DevDocker automatically remaps volume mount paths from container paths (`/workspaces/...`) to host paths so the Docker daemon can access them.

Set `HOST_WORKSPACE_FOLDER` in your devcontainer's `containerEnv` to enable path remapping:

```json
{
  "containerEnv": {
    "HOST_WORKSPACE_FOLDER": "${localWorkspaceFolder}"
  }
}
```

A companion [devcontainer feature](devcontainer-feature/devcontainer-feature.json) is included that installs the Docker CLI and configures the workspace environment.

## Project Structure

```
my-project/
  docker/
    base/
      Dockerfile          # Base image (built first via FROM dependency)
    grpc-tools/
      Dockerfile          # Tool image (FROM base)
    http-tools/
      Dockerfile
  src/
    devdocker.json        # Tasks for this subdirectory
  devdocker.json          # Root-level tasks
```

Images are discovered from the `docker/` directory. Build order is determined automatically from `FROM` dependencies between images.

## License

MIT
