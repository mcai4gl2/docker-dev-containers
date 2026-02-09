import './mock-vscode';
import * as assert from 'assert';
import * as vscodeStub from './vscode-stub';
import * as child_process from 'child_process';

// Mock child_process before importing dockerClient
let execSyncCalls: { command: string, options?: any }[] = [];
let spawnCalls: { command: string, args: string[], options?: any }[] = [];

const mockChildProcess = {
  execSync: (command: string, options?: any) => {
    execSyncCalls.push({ command, options });
    return Buffer.from('mock output');
  },
  spawn: (command: string, args: string[], options?: any) => {
    spawnCalls.push({ command, args, options });
    return {
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      on: (event: string, callback: any) => {
        if (event === 'close') callback(0);
      }
    };
  }
};

// Use a trick to mock child_process for the module
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id: string) {
  if (id === 'child_process') {
    return mockChildProcess;
  }
  return originalRequire.apply(this, arguments);
};

// Now import dockerClient
import * as dockerClient from '../../src/docker/dockerClient';

describe('dockerClient', () => {
  beforeEach(() => {
    execSyncCalls = [];
    spawnCalls = [];
  });

  describe('getDockerEnv', () => {
    it('returns process.env by default', () => {
      const env = dockerClient.getDockerEnv();
      assert.strictEqual(env.PATH, process.env.PATH);
      assert.strictEqual(env.DOCKER_HOST, undefined);
    });

    it('returns DOCKER_HOST when configured', () => {
      const originalGetConfiguration = vscodeStub.workspace.getConfiguration;
      (vscodeStub.workspace as any).getConfiguration = () => ({
        get: (key: string, defaultValue?: any) => {
          if (key === 'dockerHost') {
            return 'npipe:////./pipe/docker_engine';
          }
          return defaultValue;
        },
      });

      try {
        const env = dockerClient.getDockerEnv();
        assert.strictEqual(env.DOCKER_HOST, 'npipe:////./pipe/docker_engine');
      } finally {
        (vscodeStub.workspace as any).getConfiguration = originalGetConfiguration;
      }
    });
  });

  describe('isDockerAvailable', () => {
    it('checks both docker version and docker info', () => {
      const result = dockerClient.isDockerAvailable();
      assert.strictEqual(result, true);
      assert.strictEqual(execSyncCalls.length, 2);
      assert.ok(execSyncCalls[0].command.includes('--version'));
      assert.ok(execSyncCalls[1].command.includes('info'));
    });

    it('passes environment to execSync', () => {
      const originalGetConfiguration = vscodeStub.workspace.getConfiguration;
      (vscodeStub.workspace as any).getConfiguration = () => ({
        get: (key: string, defaultValue?: any) => {
          if (key === 'dockerHost') return 'tcp://localhost:2375';
          return defaultValue;
        },
      });

      try {
        dockerClient.isDockerAvailable();
        assert.strictEqual(execSyncCalls[0].options.env.DOCKER_HOST, 'tcp://localhost:2375');
      } finally {
        (vscodeStub.workspace as any).getConfiguration = originalGetConfiguration;
      }
    });
  });

  describe('runDockerCommand', () => {
    it('uses shell: true and passes environment', async () => {
      const outputChannel = vscodeStub.window.createOutputChannel('test');
      
      const originalGetConfiguration = vscodeStub.workspace.getConfiguration;
      (vscodeStub.workspace as any).getConfiguration = () => ({
        get: (key: string, defaultValue?: any) => {
          if (key === 'dockerHost') return 'tcp://localhost:2375';
          return defaultValue;
        },
      });

      try {
        await dockerClient.runDockerCommand(['ps'], outputChannel as any);
        
        assert.strictEqual(spawnCalls.length, 1);
        assert.strictEqual(spawnCalls[0].options.shell, true);
        assert.strictEqual(spawnCalls[0].options.env.DOCKER_HOST, 'tcp://localhost:2375');
      } finally {
        (vscodeStub.workspace as any).getConfiguration = originalGetConfiguration;
      }
    });
  });
});