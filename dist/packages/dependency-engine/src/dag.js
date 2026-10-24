import { CycleDetectedError, DuplicateEdgeError } from '../../domain/src/index.js';
export { CycleDetectedError, DuplicateEdgeError };
/**
 * Directed Acyclic Graph (DAG) for Claim and Evidence Dependencies.
 * Edges point from PREREQUISITE (parent) -> DEPENDENT (child/claim).
 */
export class DependencyDAG {
    // Map of node ID to outgoing neighbors (dependents)
    adjacencyList = new Map();
    // Map of node ID to incoming neighbors (parents / prerequisites)
    reverseAdjacencyList = new Map();
    // Node metadata registry
    nodes = new Map();
    /**
     * Registers a node in the graph if not already present.
     */
    addNode(id, type) {
        if (!this.nodes.has(id)) {
            this.nodes.set(id, { id, type });
            this.adjacencyList.set(id, new Set());
            this.reverseAdjacencyList.set(id, new Set());
        }
    }
    /**
     * Checks if a node exists in the graph.
     */
    hasNode(id) {
        return this.nodes.has(id);
    }
    /**
     * Returns node metadata.
     */
    getNode(id) {
        return this.nodes.get(id);
    }
    /**
     * Adds a directed dependency edge: parentId -> dependentId.
     * Throws CycleDetectedError if this edge would introduce a cycle.
     */
    addEdge(parentId, parentType, dependentId, dependentType) {
        this.addNode(parentId, parentType);
        this.addNode(dependentId, dependentType);
        // Direct self-dependency cycle
        if (parentId === dependentId) {
            throw new CycleDetectedError([parentId, dependentId]);
        }
        // Check if adding parentId -> dependentId would create a cycle.
        // A cycle occurs if parentId is already reachable from dependentId.
        const pathFromDependentToParent = this.findPath(dependentId, parentId);
        if (pathFromDependentToParent.length > 0) {
            throw new CycleDetectedError([...pathFromDependentToParent, dependentId]);
        }
        this.adjacencyList.get(parentId).add(dependentId);
        this.reverseAdjacencyList.get(dependentId).add(parentId);
    }
    /**
     * Checks if an edge already exists.
     */
    hasEdge(parentId, dependentId) {
        return this.adjacencyList.get(parentId)?.has(dependentId) ?? false;
    }
    /**
     * Removes a directed edge.
     */
    removeEdge(parentId, dependentId) {
        const forwardRemoved = this.adjacencyList.get(parentId)?.delete(dependentId) ?? false;
        const reverseRemoved = this.reverseAdjacencyList.get(dependentId)?.delete(parentId) ?? false;
        return forwardRemoved && reverseRemoved;
    }
    /**
     * Direct dependents (children) of a node.
     */
    getDirectDependents(id) {
        const set = this.adjacencyList.get(id);
        return set ? Array.from(set).sort() : [];
    }
    /**
     * Direct prerequisites (parents) of a node.
     */
    getDirectParents(id) {
        const set = this.reverseAdjacencyList.get(id);
        return set ? Array.from(set).sort() : [];
    }
    /**
     * Retrieves all transitive descendants of a given node in breadth-first order.
     */
    getDescendants(startId) {
        if (!this.nodes.has(startId)) {
            return [];
        }
        const visited = new Set();
        const queue = [startId];
        visited.add(startId);
        const result = [];
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = Array.from(this.adjacencyList.get(current) || []).sort();
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    result.push(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        return result;
    }
    /**
     * Retrieves all transitive ancestors of a given node.
     */
    getAncestors(startId) {
        if (!this.nodes.has(startId)) {
            return [];
        }
        const visited = new Set();
        const queue = [startId];
        visited.add(startId);
        const result = [];
        while (queue.length > 0) {
            const current = queue.shift();
            const parents = Array.from(this.reverseAdjacencyList.get(current) || []).sort();
            for (const parent of parents) {
                if (!visited.has(parent)) {
                    visited.add(parent);
                    result.push(parent);
                    queue.push(parent);
                }
            }
        }
        return result;
    }
    /**
     * Deterministic topological sort over a subset of nodes (or entire graph if none provided).
     * Uses Kahn's algorithm with alphanumeric tie-breaking for 100% determinism.
     */
    topologicalSort(subset) {
        const nodeSet = new Set(subset ?? this.nodes.keys());
        const inDegree = new Map();
        for (const node of nodeSet) {
            let degree = 0;
            const parents = this.reverseAdjacencyList.get(node);
            if (parents) {
                for (const p of parents) {
                    if (nodeSet.has(p)) {
                        degree++;
                    }
                }
            }
            inDegree.set(node, degree);
        }
        // Queue of nodes with in-degree 0 in the induced subgraph
        const available = [];
        for (const [node, degree] of inDegree.entries()) {
            if (degree === 0) {
                available.push(node);
            }
        }
        // Alphanumeric sort for determinism
        available.sort();
        const sorted = [];
        while (available.length > 0) {
            const current = available.shift();
            sorted.push(current);
            const children = Array.from(this.adjacencyList.get(current) || []).sort();
            for (const child of children) {
                if (nodeSet.has(child)) {
                    const newDeg = (inDegree.get(child) || 0) - 1;
                    inDegree.set(child, newDeg);
                    if (newDeg === 0) {
                        // Insert and keep sorted
                        this.insertSorted(available, child);
                    }
                }
            }
        }
        if (sorted.length !== nodeSet.size) {
            throw new Error('Graph contains a cycle or invalid subgraph structure');
        }
        return sorted;
    }
    /**
     * Helper to find a path from source to target using DFS.
     */
    findPath(source, target) {
        const visited = new Set();
        const path = [];
        const dfs = (curr) => {
            visited.add(curr);
            path.push(curr);
            if (curr === target) {
                return true;
            }
            const neighbors = this.adjacencyList.get(curr);
            if (neighbors) {
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        if (dfs(neighbor)) {
                            return true;
                        }
                    }
                }
            }
            path.pop();
            return false;
        };
        dfs(source);
        return path;
    }
    insertSorted(arr, item) {
        let low = 0;
        let high = arr.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (arr[mid] < item) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        arr.splice(low, 0, item);
    }
    /**
     * Total number of nodes in graph.
     */
    get nodeCount() {
        return this.nodes.size;
    }
    /**
     * Total number of edges in graph.
     */
    get edgeCount() {
        let count = 0;
        for (const neighbors of this.adjacencyList.values()) {
            count += neighbors.size;
        }
        return count;
    }
}
