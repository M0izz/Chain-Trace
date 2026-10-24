"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../../packages/dependency-engine/src/index.js");
(0, vitest_1.describe)('DependencyDAG - Unit Tests', () => {
    (0, vitest_1.it)('detects simple cycles and reports the cycle path', () => {
        const dag = new index_js_1.DependencyDAG();
        dag.addEdge('A', 'CLAIM', 'B', 'CLAIM');
        dag.addEdge('B', 'CLAIM', 'C', 'CLAIM');
        (0, vitest_1.expect)(() => {
            dag.addEdge('C', 'CLAIM', 'A', 'CLAIM');
        }).toThrow(index_js_1.CycleDetectedError);
        try {
            dag.addEdge('C', 'CLAIM', 'A', 'CLAIM');
        }
        catch (err) {
            const cycleErr = err;
            (0, vitest_1.expect)(cycleErr.path).toEqual(['A', 'B', 'C', 'A']);
        }
    });
    (0, vitest_1.it)('detects 4-node cycles (A -> B -> C -> D -> A)', () => {
        const dag = new index_js_1.DependencyDAG();
        dag.addEdge('node1', 'CLAIM', 'node2', 'CLAIM');
        dag.addEdge('node2', 'CLAIM', 'node3', 'CLAIM');
        dag.addEdge('node3', 'CLAIM', 'node4', 'CLAIM');
        (0, vitest_1.expect)(() => {
            dag.addEdge('node4', 'CLAIM', 'node1', 'CLAIM');
        }).toThrow(index_js_1.CycleDetectedError);
    });
    (0, vitest_1.it)('rejects self loops (A -> A)', () => {
        const dag = new index_js_1.DependencyDAG();
        (0, vitest_1.expect)(() => {
            dag.addEdge('self', 'CLAIM', 'self', 'CLAIM');
        }).toThrow(index_js_1.CycleDetectedError);
    });
    (0, vitest_1.it)('provides deterministic topological sorting with tie-breaking', () => {
        const dag = new index_js_1.DependencyDAG();
        // B and C both depend on A; D depends on both B and C
        dag.addEdge('A', 'CLAIM', 'C', 'CLAIM');
        dag.addEdge('A', 'CLAIM', 'B', 'CLAIM');
        dag.addEdge('B', 'CLAIM', 'D', 'CLAIM');
        dag.addEdge('C', 'CLAIM', 'D', 'CLAIM');
        const sorted1 = dag.topologicalSort();
        const sorted2 = dag.topologicalSort();
        // Tie-break ensures B precedes C alphabetically
        (0, vitest_1.expect)(sorted1).toEqual(['A', 'B', 'C', 'D']);
        (0, vitest_1.expect)(sorted2).toEqual(sorted1);
    });
    (0, vitest_1.it)('traverses direct and transitive descendants', () => {
        const dag = new index_js_1.DependencyDAG();
        dag.addEdge('root', 'EVIDENCE', 'c1', 'CLAIM');
        dag.addEdge('c1', 'CLAIM', 'c2', 'CLAIM');
        dag.addEdge('c1', 'CLAIM', 'c3', 'CLAIM');
        dag.addEdge('c2', 'CLAIM', 'c4', 'CLAIM');
        (0, vitest_1.expect)(dag.getDirectDependents('c1')).toEqual(['c2', 'c3']);
        const desc = dag.getDescendants('root');
        (0, vitest_1.expect)(desc).toContain('c1');
        (0, vitest_1.expect)(desc).toContain('c2');
        (0, vitest_1.expect)(desc).toContain('c3');
        (0, vitest_1.expect)(desc).toContain('c4');
    });
    (0, vitest_1.it)('traverses direct and transitive ancestors', () => {
        const dag = new index_js_1.DependencyDAG();
        dag.addEdge('ev1', 'EVIDENCE', 'c1', 'CLAIM');
        dag.addEdge('c1', 'CLAIM', 'c2', 'CLAIM');
        (0, vitest_1.expect)(dag.getDirectParents('c2')).toEqual(['c1']);
        (0, vitest_1.expect)(dag.getAncestors('c2')).toEqual(['c1', 'ev1']);
    });
    (0, vitest_1.it)('removes edges correctly without breaking node registration', () => {
        const dag = new index_js_1.DependencyDAG();
        dag.addEdge('p', 'CLAIM', 'c', 'CLAIM');
        (0, vitest_1.expect)(dag.hasEdge('p', 'c')).toBe(true);
        dag.removeEdge('p', 'c');
        (0, vitest_1.expect)(dag.hasEdge('p', 'c')).toBe(false);
        (0, vitest_1.expect)(dag.hasNode('p')).toBe(true);
        (0, vitest_1.expect)(dag.hasNode('c')).toBe(true);
    });
});
