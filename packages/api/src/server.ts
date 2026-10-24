import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DurableTrailService } from '../../service/src/durable-trail-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ApiServerOptions {
  service: DurableTrailService;
  apiKey?: string;
  logger?: boolean;
}

/**
 * Builds the Fastify API server with route handlers, auth guards, and input validation.
 */
export function buildApiServer(options: ApiServerOptions): FastifyInstance {
  const app = fastify({
    logger: options.logger ?? false,
    genReqId: () => randomUUID()
  });

  const expectedApiKey = options.apiKey ?? process.env.API_KEY ?? 'phase3-secret-key';

  // Request correlation and CORS hook
  app.addHook('onRequest', async (req, reply) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || req.id;
    reply.header('x-correlation-id', correlationId);

    // Cross-Origin Resource Sharing for Vercel <-> Render deployment
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, idempotency-key, x-correlation-id');

    if (req.method === 'OPTIONS') {
      return reply.status(204).send();
    }
  });

  // --------------------------------------------------------------------------
  // Health & Readiness Probes
  // --------------------------------------------------------------------------
  app.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  });

  app.get('/ready', async () => {
    return {
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  });

  // --------------------------------------------------------------------------
  // GET /v1/trails/:sourceChainId/:sourceTxHash
  // --------------------------------------------------------------------------
  app.get(
    '/v1/trails/:sourceChainId/:sourceTxHash',
    async (
      req: FastifyRequest<{ Params: { sourceChainId: string; sourceTxHash: string } }>,
      reply: FastifyReply
    ) => {
      const { sourceChainId, sourceTxHash } = req.params;

      const chainIdNum = parseInt(sourceChainId, 10);
      if (isNaN(chainIdNum) || chainIdNum <= 0) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: `Invalid sourceChainId: ${sourceChainId}. Must be a positive integer.`
        });
      }

      if (!/^0x[a-fA-F0-9]{64}$/.test(sourceTxHash)) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: `Invalid sourceTxHash: ${sourceTxHash}. Must be a 32-byte hexadecimal hash.`
        });
      }

      try {
        const trail = await options.service.getOrIngestTrail(chainIdNum, sourceTxHash);
        return trail;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({
          error: 'UPSTREAM_FAILURE',
          message: msg
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // GET /v1/claims/:claimId
  // --------------------------------------------------------------------------
  app.get(
    '/v1/claims/:claimId',
    async (req: FastifyRequest<{ Params: { claimId: string } }>, reply: FastifyReply) => {
      const { claimId } = req.params;

      const claim = options.service.store.getClaimById(claimId);
      if (!claim) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Claim not found: ${claimId}`
        });
      }

      return claim;
    }
  );

  // --------------------------------------------------------------------------
  // GET /v1/evidence/:evidenceId
  // --------------------------------------------------------------------------
  app.get(
    '/v1/evidence/:evidenceId',
    async (req: FastifyRequest<{ Params: { evidenceId: string } }>, reply: FastifyReply) => {
      const { evidenceId } = req.params;

      const evidence = options.service.store.getEvidenceById(evidenceId);
      if (!evidence) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Evidence not found: ${evidenceId}`
        });
      }

      return evidence;
    }
  );

  // --------------------------------------------------------------------------
  // GET /v1/trails/:trailId/audit
  // --------------------------------------------------------------------------
  app.get(
    '/v1/trails/:trailId/audit',
    async (
      req: FastifyRequest<{
        Params: { trailId: string };
        Querystring: { limit?: string; offset?: string };
      }>,
      _reply: FastifyReply
    ) => {
      const { trailId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

      const { events, total } = options.service.store.listAuditEvents({
        trailId,
        limit,
        offset
      });

      return {
        trailId,
        limit,
        offset,
        total,
        events
      };
    }
  );

  // --------------------------------------------------------------------------
  // POST /v1/trails/:trailId/refresh (Authenticated & Rate-Limited)
  // --------------------------------------------------------------------------
  app.post(
    '/v1/trails/:trailId/refresh',
    async (
      req: FastifyRequest<{
        Params: { trailId: string };
        Body?: { checkReorg?: boolean };
        Headers: { 'x-api-key'?: string; 'idempotency-key'?: string };
      }>,
      reply: FastifyReply
    ) => {
      const authHeader = req.headers['x-api-key'];
      if (!authHeader || authHeader !== expectedApiKey) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Valid x-api-key header required for state-changing refresh operations'
        });
      }

      const { trailId } = req.params;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
      const checkReorg = req.body?.checkReorg ?? true;

      try {
        const result = await options.service.refreshTrail(trailId, {
          idempotencyKey,
          checkReorg
        });

        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Rate limit')) {
          return reply.status(429).send({
            error: 'RATE_LIMIT_EXCEEDED',
            message: msg
          });
        }
        if (msg.includes('Trail not found')) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: msg
          });
        }
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: msg
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // Phase 4 Static UI Explorer Routes
  // --------------------------------------------------------------------------
  const publicDir = [
    resolve(process.cwd(), 'packages', 'ui', 'public'),
    resolve(__dirname, '..', '..', 'ui', 'public'),
    resolve(__dirname, '..', '..', '..', 'packages', 'ui', 'public')
  ].find((d) => existsSync(d));

  if (publicDir) {
    app.get('/', async (_req: FastifyRequest, reply: FastifyReply) => {
      const htmlPath = join(publicDir, 'index.html');
      if (existsSync(htmlPath)) {
        const html = readFileSync(htmlPath, 'utf-8');
        return reply.type('text/html').send(html);
      }
      return reply.status(404).send('UI index.html not found');
    });

    app.get('/assets/styles.css', async (_req: FastifyRequest, reply: FastifyReply) => {
      const cssPath = join(publicDir, 'styles.css');
      if (existsSync(cssPath)) {
        const css = readFileSync(cssPath, 'utf-8');
        return reply.type('text/css').send(css);
      }
      return reply.status(404).send('styles.css not found');
    });

    app.get('/assets/app.js', async (_req: FastifyRequest, reply: FastifyReply) => {
      const jsPath = join(publicDir, 'app.js');
      if (existsSync(jsPath)) {
        const js = readFileSync(jsPath, 'utf-8');
        return reply.type('application/javascript').send(js);
      }
      return reply.status(404).send('app.js not found');
    });
  }

  return app;
}
