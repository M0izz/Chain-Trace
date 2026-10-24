import { FastifyInstance } from 'fastify';
import { DurableTrailService } from '../../service/src/durable-trail-service.js';
export interface ApiServerOptions {
    service: DurableTrailService;
    apiKey?: string;
    logger?: boolean;
}
/**
 * Builds the Fastify API server with route handlers, auth guards, and input validation.
 */
export declare function buildApiServer(options: ApiServerOptions): FastifyInstance;
