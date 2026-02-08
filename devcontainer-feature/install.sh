#!/usr/bin/env bash
#
# DevDocker devcontainer feature installer.
#
# Sets up the devcontainer for docker-from-docker usage:
# - Ensures Docker CLI is available
# - Verifies Docker socket accessibility
# - Configures HOST_WORKSPACE_FOLDER environment variable
#

set -e

INSTALL_DOCKER_CLI="${INSTALLDOCKERCLI:-true}"
MOUNT_DOCKER_SOCKET="${MOUNTDOCKERSOCKET:-true}"

echo "DevDocker: Configuring devcontainer for docker-from-docker..."

# 1. Check / install Docker CLI
if [ "$INSTALL_DOCKER_CLI" = "true" ]; then
    if ! command -v docker &> /dev/null; then
        echo "DevDocker: Docker CLI not found, installing..."
        apt-get update
        apt-get install -y --no-install-recommends \
            ca-certificates \
            curl \
            gnupg
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
          tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update
        apt-get install -y --no-install-recommends docker-ce-cli
        rm -rf /var/lib/apt/lists/*
        echo "DevDocker: Docker CLI installed."
    else
        echo "DevDocker: Docker CLI already available at $(command -v docker)"
    fi
fi

# 2. Verify Docker socket
if [ "$MOUNT_DOCKER_SOCKET" = "true" ]; then
    if [ -S /var/run/docker.sock ]; then
        echo "DevDocker: Docker socket available at /var/run/docker.sock"

        # Ensure the vscode user can access the socket
        SOCKET_GID=$(stat -c '%g' /var/run/docker.sock)
        if getent group docker > /dev/null 2>&1; then
            echo "DevDocker: docker group exists (GID: $(getent group docker | cut -d: -f3))"
        else
            groupadd -g "$SOCKET_GID" docker 2>/dev/null || true
        fi

        # Add vscode user to docker group if user exists
        if id "vscode" &>/dev/null; then
            usermod -aG docker vscode 2>/dev/null || true
            echo "DevDocker: Added vscode user to docker group"
        fi
    else
        echo "DevDocker: WARNING - Docker socket not found at /var/run/docker.sock"
        echo "  Ensure your devcontainer.json mounts the Docker socket from the host."
        echo "  Add to devcontainer.json:"
        echo '    "mounts": ["type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock"]'
    fi
fi

# 3. Write a profile.d script to export HOST_WORKSPACE_FOLDER
# This ensures it's available in all shells, not just the VS Code terminal
cat > /etc/profile.d/devdocker.sh << 'PROFILE_EOF'
# DevDocker: Export HOST_WORKSPACE_FOLDER for docker-from-docker volume remapping
if [ -n "$HOST_WORKSPACE_FOLDER" ]; then
    export HOST_WORKSPACE_FOLDER
fi
PROFILE_EOF
chmod +x /etc/profile.d/devdocker.sh

echo "DevDocker: Devcontainer feature setup complete."
