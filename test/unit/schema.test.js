"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
//# sourceMappingURL=schema.test.js.map