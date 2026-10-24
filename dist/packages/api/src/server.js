import fastify from 'fastify';
import { randomUUID } from 'node:crypto';
/**
 * Builds the Fastify API server with route handlers, auth guards, and input validation.
 */
export function buildApiServer(options) {
    const app = fastify({
        logger: options.logger ?? false,
        genReqId: () => randomUUID()
    });
    const expectedApiKey = options.apiKey ?? process.env.API_KEY ?? 'phase3-secret-key';
    // Request correlation hook
    app.addHook('onRequest', async (req, reply) => {
        const correlationId = req.headers['x-correlation-id'] || req.id;
        reply.header('x-correlation-id', correlationId);
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
    app.get('/v1/trails/:sourceChainId/:sourceTxHash', async (req, reply) => {
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return reply.status(502).send({
                error: 'UPSTREAM_FAILURE',
                message: msg
            });
        }
    });
    // --------------------------------------------------------------------------
    // GET /v1/claims/:claimId
    // --------------------------------------------------------------------------
    app.get('/v1/claims/:claimId', async (req, reply) => {
        const { claimId } = req.params;
        const claim = options.service.store.getClaimById(claimId);
        if (!claim) {
            return reply.status(404).send({
                error: 'NOT_FOUND',
                message: `Claim not found: ${claimId}`
            });
        }
        return claim;
    });
    // --------------------------------------------------------------------------
    // GET /v1/evidence/:evidenceId
    // --------------------------------------------------------------------------
    app.get('/v1/evidence/:evidenceId', async (req, reply) => {
        const { evidenceId } = req.params;
        const evidence = options.service.store.getEvidenceById(evidenceId);
        if (!evidence) {
            return reply.status(404).send({
                error: 'NOT_FOUND',
                message: `Evidence not found: ${evidenceId}`
            });
        }
        return evidence;
    });
    // --------------------------------------------------------------------------
    // GET /v1/trails/:trailId/audit
    // --------------------------------------------------------------------------
    app.get('/v1/trails/:trailId/audit', async (req, _reply) => {
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
    });
    // --------------------------------------------------------------------------
    // POST /v1/trails/:trailId/refresh (Authenticated & Rate-Limited)
    // --------------------------------------------------------------------------
    app.post('/v1/trails/:trailId/refresh', async (req, reply) => {
        const authHeader = req.headers['x-api-key'];
        if (!authHeader || authHeader !== expectedApiKey) {
            return reply.status(401).send({
                error: 'UNAUTHORIZED',
                message: 'Valid x-api-key header required for state-changing refresh operations'
            });
        }
        const { trailId } = req.params;
        const idempotencyKey = req.headers['idempotency-key'];
        const checkReorg = req.body?.checkReorg ?? true;
        try {
            const result = await options.service.refreshTrail(trailId, {
                idempotencyKey,
                checkReorg
            });
            return result;
        }
        catch (err) {
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
    });
    return app;
}
