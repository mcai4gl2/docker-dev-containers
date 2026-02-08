/**
 * Minimal vscode module mock for unit testing.
 * Register this before running tests to allow importing modules
 * that reference 'vscode'.
 */
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request: string, ...args: any[]) {
  if (request === 'vscode') {
    return require.resolve('./vscode-stub');
  }
  return originalResolveFilename.call(this, request, ...args);
};
