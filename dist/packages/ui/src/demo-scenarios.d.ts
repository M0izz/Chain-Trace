import type { ChainedAuditEvent } from '../../domain/src/index.js';
import { DurableTrailResponse } from '../../service/src/durable-trail-service.js';
export interface DemoScenario {
    id: string;
    name: string;
    badge: string;
    description: string;
    sourceChainId: number;
    sourceTxHash: string;
    isFixture: boolean;
    trail: DurableTrailResponse;
    auditTrail: ChainedAuditEvent[];
}
export declare const DEMO_SCENARIOS: DemoScenario[];
