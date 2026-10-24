import { pathToFileURL } from 'node:url';
import { startServer } from './packages/api/src/start.js';

export * from './packages/domain/src/index.js';
export * from './packages/dependency-engine/src/index.js';
export * from './packages/verification/src/index.js';
export * from './packages/chain-adapters/src/index.js';
export * from './packages/persistence/src/index.js';
export * from './packages/service/src/index.js';
export * from './packages/api/src/index.js';
export * from './packages/ui/src/index.js';
export { startServer };

// Boot Fastify service when executed directly as entrypoint (e.g. Render `node dist/index.js`)
const isMainModule = Boolean(
  process.argv[1] && (
    pathToFileURL(process.argv[1]).href === import.meta.url ||
    process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('index.ts')
  )
);

if (isMainModule) {
  startServer().catch((err) => {
    console.error('Fatal error booting ChainTrace service:', err);
    process.exit(1);
  });
}
