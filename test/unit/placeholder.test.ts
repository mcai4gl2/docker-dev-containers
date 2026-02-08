import * as assert from 'assert';
import { resolvePlaceholders, resolveVolumePlaceholders } from '../../src/utils/placeholder';

describe('resolvePlaceholders', () => {
  const ctx = { workspaceFolder: '/home/user/project' };

  describe('{workspaceFolder} placeholder', () => {
    it('resolves {workspaceFolder} to workspace path', () => {
      const result = resolvePlaceholders('{workspaceFolder}:/workspace', ctx);
      assert.strictEqual(result, '/home/user/project:/workspace');
    });

    it('resolves multiple {workspaceFolder} occurrences', () => {
      const result = resolvePlaceholders(
        '{workspaceFolder}/src:{workspaceFolder}/dest',
        ctx,
      );
      assert.strictEqual(result, '/home/user/project/src:/home/user/project/dest');
    });
  });

  describe('{project_root} placeholder', () => {
    it('resolves {project_root} to workspace path (backward compat)', () => {
      const result = resolvePlaceholders('{project_root}:/workspace', ctx);
      assert.strictEqual(result, '/home/user/project:/workspace');
    });
  });

  describe('${VAR} environment variable placeholder', () => {
    it('resolves ${VAR} from environment', () => {
      const origVal = process.env['HOME'];
      process.env['TEST_PLACEHOLDER_VAR'] = '/custom/path';
      try {
        const result = resolvePlaceholders('${TEST_PLACEHOLDER_VAR}/data', ctx);
        assert.strictEqual(result, '/custom/path/data');
      } finally {
        delete process.env['TEST_PLACEHOLDER_VAR'];
      }
    });

    it('resolves missing env var to empty string', () => {
      delete process.env['NONEXISTENT_TEST_VAR_12345'];
      const result = resolvePlaceholders('prefix-${NONEXISTENT_TEST_VAR_12345}-suffix', ctx);
      assert.strictEqual(result, 'prefix--suffix');
    });

    it('resolves multiple env vars', () => {
      process.env['TEST_A'] = 'alpha';
      process.env['TEST_B'] = 'beta';
      try {
        const result = resolvePlaceholders('${TEST_A}-${TEST_B}', ctx);
        assert.strictEqual(result, 'alpha-beta');
      } finally {
        delete process.env['TEST_A'];
        delete process.env['TEST_B'];
      }
    });
  });

  describe('mixed placeholders', () => {
    it('resolves all placeholder types in one string', () => {
      process.env['TEST_MIX_VAR'] = 'mixed';
      try {
        const result = resolvePlaceholders(
          '{workspaceFolder}/${TEST_MIX_VAR}',
          ctx,
        );
        assert.strictEqual(result, '/home/user/project/mixed');
      } finally {
        delete process.env['TEST_MIX_VAR'];
      }
    });
  });

  describe('no placeholders', () => {
    it('returns string unchanged if no placeholders', () => {
      const result = resolvePlaceholders('/usr/local/bin', ctx);
      assert.strictEqual(result, '/usr/local/bin');
    });

    it('handles empty string', () => {
      const result = resolvePlaceholders('', ctx);
      assert.strictEqual(result, '');
    });
  });
});

describe('resolveVolumePlaceholders', () => {
  const ctx = { workspaceFolder: '/home/user/project' };

  it('resolves placeholders in a list of volumes', () => {
    const volumes = [
      '{workspaceFolder}:/workspace',
      '{project_root}/data:/data',
    ];
    const resolved = resolveVolumePlaceholders(volumes, ctx);
    assert.deepStrictEqual(resolved, [
      '/home/user/project:/workspace',
      '/home/user/project/data:/data',
    ]);
  });

  it('returns empty array for empty input', () => {
    const resolved = resolveVolumePlaceholders([], ctx);
    assert.deepStrictEqual(resolved, []);
  });

  it('leaves volumes without placeholders unchanged', () => {
    const volumes = ['/tmp:/tmp', '/var/run/docker.sock:/var/run/docker.sock'];
    const resolved = resolveVolumePlaceholders(volumes, ctx);
    assert.deepStrictEqual(resolved, volumes);
  });
});
