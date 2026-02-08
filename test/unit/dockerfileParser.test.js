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
const dockerfileParser_1 = require("../../src/utils/dockerfileParser");
describe('extractDockerfileMetadata', () => {
    describe('description extraction', () => {
        it('extracts description from comment containing "container"', () => {
            const content = '# gRPC development tools container\nFROM ubuntu:22.04\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.strictEqual(meta.description, 'gRPC development tools container');
        });
        it('extracts description case-insensitively', () => {
            const content = '# HTTP Container for testing\nFROM alpine:3.18\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.strictEqual(meta.description, 'HTTP Container for testing');
        });
        it('only looks at first 10 lines for description', () => {
            const lines = Array(12).fill('# some comment');
            lines[11] = '# late container description';
            const content = lines.join('\n');
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            // Should not find the description at line 12
            assert.strictEqual(meta.description, null);
        });
        it('returns null description if no comment contains "container"', () => {
            const content = '# Just a Dockerfile\nFROM ubuntu:22.04\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.strictEqual(meta.description, null);
        });
        it('returns null description for empty Dockerfile', () => {
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)('');
            assert.strictEqual(meta.description, null);
        });
        it('skips lines starting with #! (shebang-like)', () => {
            const content = '#! not a container description\n# actual container comment\nFROM ubuntu\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.strictEqual(meta.description, 'actual container comment');
        });
        it('strips leading # and spaces from description', () => {
            const content = '##  MCP tools container  \nFROM ubuntu\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            // trim() strips trailing spaces, then replace strips leading ## and spaces
            assert.strictEqual(meta.description, 'MCP tools container');
        });
    });
    describe('tool extraction - go install', () => {
        it('extracts tool from go install', () => {
            const content = 'RUN go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('grpcurl'));
        });
        it('extracts multiple go install tools', () => {
            const content = [
                'RUN go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest',
                'RUN go install github.com/fullstorydev/grpcui/cmd/grpcui@latest',
                'RUN go install github.com/bufbuild/buf/cmd/buf@v1.28.0',
            ].join('\n');
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('grpcurl'));
            assert.ok(meta.tools.includes('grpcui'));
            assert.ok(meta.tools.includes('buf'));
        });
    });
    describe('tool extraction - apt-get install', () => {
        it('extracts tools from apt-get install', () => {
            const content = 'RUN apt-get install -y curl jq\\\n && rm -rf\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('curl'));
            assert.ok(meta.tools.includes('jq'));
        });
        it('ignores common base packages', () => {
            const content = 'RUN apt-get install -y build-essential ca-certificates gnupg curl\\\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('curl'));
            assert.ok(!meta.tools.includes('build-essential'));
            assert.ok(!meta.tools.includes('ca-certificates'));
            assert.ok(!meta.tools.includes('gnupg'));
        });
        it('handles apt-get install with multiple lines', () => {
            const content = 'RUN apt-get update && apt-get install -y curl jq && rm -rf /var/lib/apt/lists/*\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('curl'));
            assert.ok(meta.tools.includes('jq'));
        });
    });
    describe('tool extraction - pip install', () => {
        it('extracts tools from pip install', () => {
            const content = 'RUN pip install httpie\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('httpie'));
        });
        it('extracts tools from pip3 install', () => {
            const content = 'RUN pip3 install mcp-server-tools\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('mcp-server-tools'));
        });
        it('ignores pip meta-packages', () => {
            const content = 'RUN pip install --upgrade pip setuptools wheel\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(!meta.tools.includes('pip'));
            assert.ok(!meta.tools.includes('setuptools'));
            assert.ok(!meta.tools.includes('wheel'));
        });
    });
    describe('tool extraction - npm install', () => {
        it('extracts tools from npm install -g', () => {
            const content = 'RUN npm install -g typescript\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('typescript'));
        });
        it('extracts scoped npm packages', () => {
            const content = 'RUN npm install -g @modelcontextprotocol/inspector\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('@modelcontextprotocol/inspector'));
        });
    });
    describe('tool extraction - common binaries', () => {
        it('detects common tool names mentioned in Dockerfile', () => {
            const content = 'RUN curl -sSL https://example.com | bash\nRUN which jq\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('curl'));
            assert.ok(meta.tools.includes('jq'));
        });
        it('detects tools case-insensitively', () => {
            const content = '# Install GRPCURL and GRPCUI\nFROM ubuntu\n';
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.ok(meta.tools.includes('grpcurl'));
            assert.ok(meta.tools.includes('grpcui'));
        });
    });
    describe('edge cases', () => {
        it('returns empty tools for empty Dockerfile', () => {
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)('');
            assert.deepStrictEqual(meta.tools, []);
        });
        it('returns sorted tools list', () => {
            const content = [
                'RUN apt-get install -y jq curl\\\n',
                'RUN go install github.com/bufbuild/buf/cmd/buf@latest\n',
            ].join('');
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            const sorted = [...meta.tools].sort();
            assert.deepStrictEqual(meta.tools, sorted);
        });
        it('deduplicates tools from multiple sources', () => {
            const content = [
                'RUN apt-get install -y curl\\\n',
                'RUN curl -sSL https://example.com\n',
            ].join('');
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            const curls = meta.tools.filter(t => t === 'curl');
            assert.strictEqual(curls.length, 1);
        });
        it('handles a realistic multi-stage Dockerfile', () => {
            const content = `# gRPC development tools container
FROM golang:1.21 AS builder
RUN go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
RUN go install github.com/fullstorydev/grpcui/cmd/grpcui@latest

FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl jq\\
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /go/bin/grpcurl /usr/local/bin/
COPY --from=builder /go/bin/grpcui /usr/local/bin/
WORKDIR /workspace
CMD ["/bin/bash"]
`;
            const meta = (0, dockerfileParser_1.extractDockerfileMetadata)(content);
            assert.strictEqual(meta.description, 'gRPC development tools container');
            assert.ok(meta.tools.includes('grpcurl'));
            assert.ok(meta.tools.includes('grpcui'));
            assert.ok(meta.tools.includes('curl'));
            assert.ok(meta.tools.includes('jq'));
        });
    });
});
//# sourceMappingURL=dockerfileParser.test.js.map