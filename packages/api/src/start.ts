import {
  LayerZeroV2Adapter,
  LAYERZERO_V2_SEPOLIA_AMOY_PROFILE,
  ReadOnlyRpcClient
} from '../../chain-adapters/src/index.js';
import { SqliteStore } from '../../persistence/src/index.js';
import { DurableTrailService } from '../../service/src/durable-trail-service.js';
import { buildApiServer } from './server.js';

export async function startServer() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  const dbPath = process.env.DB_PATH || 'chaintrace.db';

  const store = new SqliteStore({ dbPath });

  const sepoliaRpcUrl = process.env.RPC_SEPOLIA_URL || LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.sourceChain.defaultRpcUrl || 'https://rpc.sepolia.org';
  const amoyRpcUrl = process.env.RPC_AMOY_URL || LAYERZERO_V2_SEPOLIA_AMOY_PROFILE.destinationChain.defaultRpcUrl || 'https://rpc-amoy.polygon.technology';

  const adapter = new LayerZeroV2Adapter({
    profile: LAYERZERO_V2_SEPOLIA_AMOY_PROFILE,
    sourceRpc: new ReadOnlyRpcClient({
      rpcUrl: sepoliaRpcUrl,
      expectedChainId: 11155111
    }),
    destinationRpc: new ReadOnlyRpcClient({
      rpcUrl: amoyRpcUrl,
      expectedChainId: 80002
    })
  });

  const service = new DurableTrailService(adapter, store);
  const app = buildApiServer({
    service,
    apiKey: process.env.API_KEY || 'phase3-secret-key',
    logger: true
  });

  try {
    const address = await app.listen({ port, host });
    console.log(`\n======================================================`);
    console.log(`  ChainTrace Server Online at ${address}`);
    console.log(`  REST API Endpoints:`);
    console.log(`   - GET  /health`);
    console.log(`   - GET  /ready`);
    console.log(`   - GET  /v1/trails/:sourceChainId/:sourceTxHash`);
    console.log(`   - GET  /v1/claims/:claimId`);
    console.log(`   - GET  /evidence/:evidenceId`);
    console.log(`   - GET  /v1/trails/:trailId/audit`);
    console.log(`   - POST /v1/trails/:trailId/refresh`);
    console.log(`======================================================\n`);
    return app;
  } catch (err) {
    console.error('Failed to start ChainTrace server:', err);
    process.exit(1);
  }
}

if (
  process.argv[1]?.endsWith('start.js') ||
  process.argv[1]?.endsWith('start.ts')
) {
  startServer();
}
