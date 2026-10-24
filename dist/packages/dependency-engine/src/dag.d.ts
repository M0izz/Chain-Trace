import { CycleDetectedError, DuplicateEdgeError } from '../../domain/src/index.js';
export { CycleDetectedError, DuplicateEdgeError };
export interface GraphNodeMetadata {
    id: string;
    type: 'CLAIM' | 'EVIDENCE' | 'POLICY';
}
/**
 * Directed Acyclic Graph (DAG) for Claim and Evidence Dependencies.
 * Edges point from PREREQUISITE (parent) -> DEPENDENT (child/claim).
 */
export declare class DependencyDAG {
    private readonly adjacencyList;
    private readonly reverseAdjacencyList;
    private readonly nodes;
    /**
     * Registers a node in the graph if not already present.
     */
    addNode(id: string, type: 'CLAIM' | 'EVIDENCE' | 'POLICY'): void;
    /**
     * Checks if a node exists in the graph.
     */
    hasNode(id: string): boolean;
    /**
     * Returns node metadata.
     */
    getNode(id: string): GraphNodeMetadata | undefined;
    /**
     * Adds a directed dependency edge: parentId -> dependentId.
     * Throws CycleDetectedError if this edge would introduce a cycle.
     */
    addEdge(parentId: string, parentType: 'CLAIM' | 'EVIDENCE' | 'POLICY', dependentId: string, dependentType: 'CLAIM'): void;
    /**
     * Checks if an edge already exists.
     */
    hasEdge(parentId: string, dependentId: string): boolean;
    /**
     * Removes a directed edge.
     */
    removeEdge(parentId: string, dependentId: string): boolean;
    /**
     * Direct dependents (children) of a node.
     */
    getDirectDependents(id: string): string[];
    /**
     * Direct prerequisites (parents) of a node.
     */
    getDirectParents(id: string): string[];
    /**
     * Retrieves all transitive descendants of a given node in breadth-first order.
     */
    getDescendants(startId: string): string[];
    /**
     * Retrieves all transitive ancestors of a given node.
     */
    getAncestors(startId: string): string[];
    /**
     * Deterministic topological sort over a subset of nodes (or entire graph if none provided).
     * Uses Kahn's algorithm with alphanumeric tie-breaking for 100% determinism.
     */
    topologicalSort(subset?: string[]): string[];
    /**
     * Helper to find a path from source to target using DFS.
     */
    private findPath;
    private insertSorted;
    /**
     * Total number of nodes in graph.
     */
    get nodeCount(): number;
    /**
     * Total number of edges in graph.
     */
    get edgeCount(): number;
}
