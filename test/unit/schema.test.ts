import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

describe('devdocker.schema.json', () => {
  const schemaPath = path.resolve(__dirname, '../../schemas/devdocker.schema.json');

  it('is valid JSON', () => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    assert.ok(schema);
  });

  it('has required $schema field', () => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    assert.ok(schema.$schema);
  });

  it('requires tasks array at root level', () => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    assert.deepStrictEqual(schema.required, ['tasks']);
    assert.strictEqual(schema.properties.tasks.type, 'array');
  });

  it('requires name and image for each task', () => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    const taskSchema = schema.properties.tasks.items;
    assert.deepStrictEqual(taskSchema.required, ['name', 'image']);
  });

  it('defines exec and shell as valid task types', () => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    const typeEnum = schema.properties.tasks.items.properties.type.enum;
    assert.deepStrictEqual(typeEnum, ['exec', 'shell']);
  });

  it('defines host, bridge, none as valid network modes', () => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    const networkEnum = schema.properties.tasks.items.properties.network_mode.enum;
    assert.deepStrictEqual(networkEnum, ['host', 'bridge', 'none']);
  });

  it('has conditional command requirement for exec tasks', () => {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    const taskSchema = schema.properties.tasks.items;
    assert.ok(taskSchema.if, 'schema should have if clause');
    assert.ok(taskSchema.then, 'schema should have then clause');
    assert.deepStrictEqual(taskSchema.then.required, ['command']);
  });
});
