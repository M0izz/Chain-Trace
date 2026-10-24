import { describe, expect, it } from 'vitest';
import { CycleDetectedError, DependencyDAG } from '../../packages/dependency-engine/src/index.js';
describe('DependencyDAG - Unit Tests', () => {
    it('detects simple cycles and reports the cycle path', () => {
        const dag = new DependencyDAG();
        dag.addEdge('A', 'CLAIM', 'B', 'CLAIM');
        dag.addEdge('B', 'CLAIM', 'C', 'CLAIM');
        expect(() => {
            dag.addEdge('C', 'CLAIM', 'A', 'CLAIM');
        }).toThrow(CycleDetectedError);
        try {
            dag.addEdge('C', 'CLAIM', 'A', 'CLAIM');
        }
        catch (err) {
            const cycleErr = err;
            expect(cycleErr.path).toEqual(['A', 'B', 'C', 'A']);
        }
    });
    it('detects 4-node cycles (A -> B -> C -> D -> A)', () => {
        const dag = new DependencyDAG();
        dag.addEdge('node1', 'CLAIM', 'node2', 'CLAIM');
        dag.addEdge('node2', 'CLAIM', 'node3', 'CLAIM');
        dag.addEdge('node3', 'CLAIM', 'node4', 'CLAIM');
        expect(() => {
            dag.addEdge('node4', 'CLAIM', 'node1', 'CLAIM');
        }).toThrow(CycleDetectedError);
    });
    it('rejects self loops (A -> A)', () => {
        const dag = new DependencyDAG();
        expect(() => {
            dag.addEdge('self', 'CLAIM', 'self', 'CLAIM');
        }).toThrow(CycleDetectedError);
    });
    it('provides deterministic topological sorting with tie-breaking', () => {
        const dag = new DependencyDAG();
        // B and C both depend on A; D depends on both B and C
        dag.addEdge('A', 'CLAIM', 'C', 'CLAIM');
        dag.addEdge('A', 'CLAIM', 'B', 'CLAIM');
        dag.addEdge('B', 'CLAIM', 'D', 'CLAIM');
        dag.addEdge('C', 'CLAIM', 'D', 'CLAIM');
        const sorted1 = dag.topologicalSort();
        const sorted2 = dag.topologicalSort();
        // Tie-break ensures B precedes C alphabetically
        expect(sorted1).toEqual(['A', 'B', 'C', 'D']);
        expect(sorted2).toEqual(sorted1);
    });
    it('traverses direct and transitive descendants', () => {
        const dag = new DependencyDAG();
        dag.addEdge('root', 'EVIDENCE', 'c1', 'CLAIM');
        dag.addEdge('c1', 'CLAIM', 'c2', 'CLAIM');
        dag.addEdge('c1', 'CLAIM', 'c3', 'CLAIM');
        dag.addEdge('c2', 'CLAIM', 'c4', 'CLAIM');
        expect(dag.getDirectDependents('c1')).toEqual(['c2', 'c3']);
        const desc = dag.getDescendants('root');
        expect(desc).toContain('c1');
        expect(desc).toContain('c2');
        expect(desc).toContain('c3');
        expect(desc).toContain('c4');
    });
    it('traverses direct and transitive ancestors', () => {
        const dag = new DependencyDAG();
        dag.addEdge('ev1', 'EVIDENCE', 'c1', 'CLAIM');
        dag.addEdge('c1', 'CLAIM', 'c2', 'CLAIM');
        expect(dag.getDirectParents('c2')).toEqual(['c1']);
        expect(dag.getAncestors('c2')).toEqual(['c1', 'ev1']);
    });
    it('removes edges correctly without breaking node registration', () => {
        const dag = new DependencyDAG();
        dag.addEdge('p', 'CLAIM', 'c', 'CLAIM');
        expect(dag.hasEdge('p', 'c')).toBe(true);
        dag.removeEdge('p', 'c');
        expect(dag.hasEdge('p', 'c')).toBe(false);
        expect(dag.hasNode('p')).toBe(true);
        expect(dag.hasNode('c')).toBe(true);
    });
});
