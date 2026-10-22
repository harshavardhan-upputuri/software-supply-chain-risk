/**
 * Computes cascading BFS propagation paths for confirmed vulnerable packages.
 *
 * Edge Direction Context:
 * In the dependency graph, edge (source -> target) means "source depends on target"
 * (e.g. org.jwall:stream-runtime depends on net.minidev:json-smart).
 * Therefore, when package T (target) is vulnerable, the impact propagates to package S (source)
 * which requires/depends on T.
 *
 * This function returns:
 * - summary: {
 *     vulnerableCount,
 *     directDependentsCount,
 *     indirectDependentsCount,
 *     totalUniqueDependents,
 *     maxImpactDepth
 *   }
 * - steps: Array of step objects:
 *     {
 *       stepIndex: 1,
 *       title: "Step 1: Vulnerable packages detected",
 *       description: "...",
 *       activeNodeIds: [...],
 *       activeEdgeIds: [...],
 *       cumulativeAffectedNodeIds: [...],
 *       cumulativeAffectedEdgeIds: [...]
 *     }
 */
export function computeCascadingImpact(elements = []) {
  const nodeElements = elements.filter((el) => !el.data.source);
  const edgeElements = elements.filter((el) => Boolean(el.data.source && el.data.target));

  // Find all confirmed vulnerable package nodes
  const vulnerableNodes = nodeElements.filter((el) => el.data.isVulnerable === "yes");
  const vulnerableNodeIds = new Set(vulnerableNodes.map((el) => String(el.data.id)));

  if (vulnerableNodes.length === 0) {
    return {
      hasVulnerabilities: false,
      summary: {
        vulnerableCount: 0,
        directDependentsCount: 0,
        indirectDependentsCount: 0,
        totalUniqueDependents: 0,
        maxImpactDepth: 0,
      },
      steps: [],
      affectedNodeDetails: new Map(),
    };
  }

  // Build reverse adjacency list: target -> array of { sourceId, edgeId }
  // When target is vulnerable, it impacts source
  const reverseAdj = new Map();
  edgeElements.forEach((edge) => {
    const s = String(edge.data.source);
    const t = String(edge.data.target);
    const edgeId = String(edge.data.id);

    if (!reverseAdj.has(t)) {
      reverseAdj.set(t, []);
    }
    reverseAdj.get(t).push({ dependentId: s, edgeId });
  });

  // Track shortest distance from any vulnerable node
  // Map: nodeId -> shortest hop distance (1 = direct dependent, 2+ = indirect dependent)
  const shortestDistance = new Map();
  // Map: nodeId -> connecting incoming edge from propagation
  const nodeReachedByEdge = new Map();

  // Multi-source BFS starting from all confirmed vulnerable nodes
  const queue = [];
  vulnerableNodes.forEach((vNode) => {
    const vId = String(vNode.data.id);
    queue.push({ nodeId: vId, depth: 0 });
  });

  // Breadth-First Hop Collection
  // hopBuckets: Array of sets for each hop level [hop1Nodes, hop2Nodes, ...]
  const hopNodes = [];
  const hopEdges = [];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift();

    const incomingDependents = reverseAdj.get(nodeId) || [];
    incomingDependents.forEach(({ dependentId, edgeId }) => {
      // Avoid traversing back to a confirmed vulnerable node or shorter visited paths
      if (vulnerableNodeIds.has(dependentId)) {
        return;
      }

      if (!shortestDistance.has(dependentId)) {
        const nextDepth = depth + 1;
        shortestDistance.set(dependentId, nextDepth);
        nodeReachedByEdge.set(dependentId, edgeId);

        // Put in hop bucket
        const hopIdx = nextDepth - 1;
        while (hopNodes.length <= hopIdx) {
          hopNodes.push(new Set());
          hopEdges.push(new Set());
        }
        hopNodes[hopIdx].add(dependentId);
        hopEdges[hopIdx].add(edgeId);

        queue.push({ nodeId: dependentId, depth: nextDepth });
      }
    });
  }

  // Count metrics
  let directCount = 0;
  let indirectCount = 0;
  let maxDepth = 0;

  shortestDistance.forEach((dist) => {
    if (dist === 1) directCount += 1;
    if (dist > 1) indirectCount += 1;
    if (dist > maxDepth) maxDepth = dist;
  });

  const totalUnique = directCount + indirectCount;

  // Build step-by-step animation sequence
  const steps = [];

  // Step 1: Confirmed vulnerable package(s) detected
  const cumulativeNodes = new Set(vulnerableNodeIds);
  const cumulativeEdges = new Set();

  steps.push({
    stepIndex: 1,
    hopLevel: 0,
    title: `Step 1: ${vulnerableNodes.length} Confirmed Vulnerable ${
      vulnerableNodes.length === 1 ? "Package" : "Packages"
    } Detected`,
    description: `Originating risk source: ${vulnerableNodes
      .map((n) => n.data.name)
      .slice(0, 3)
      .join(", ")}${vulnerableNodes.length > 3 ? "..." : ""}`,
    activeNodeIds: Array.from(vulnerableNodeIds),
    activeEdgeIds: [],
    cumulativeAffectedNodeIds: Array.from(cumulativeNodes),
    cumulativeAffectedEdgeIds: [],
    isOrigin: true,
    isComplete: false,
  });

  // Steps 2+: Sequential BFS Hops
  hopNodes.forEach((nodeSet, idx) => {
    const hopLevel = idx + 1;
    const currentHopNodeIds = Array.from(nodeSet);
    const currentHopEdgeIds = Array.from(hopEdges[idx]);

    currentHopNodeIds.forEach((id) => cumulativeNodes.add(id));
    currentHopEdgeIds.forEach((id) => cumulativeEdges.add(id));

    const isDirect = hopLevel === 1;
    const stepNum = steps.length + 1;

    steps.push({
      stepIndex: stepNum,
      hopLevel,
      title: `Step ${stepNum}: ${currentHopNodeIds.length} ${
        isDirect ? "Direct" : "Indirect"
      } ${currentHopNodeIds.length === 1 ? "Dependent" : "Dependents"} Reached`,
      description: `Hop distance ${hopLevel} outward along reverse dependency propagation`,
      activeNodeIds: currentHopNodeIds,
      activeEdgeIds: currentHopEdgeIds,
      cumulativeAffectedNodeIds: Array.from(cumulativeNodes),
      cumulativeAffectedEdgeIds: Array.from(cumulativeEdges),
      isOrigin: false,
      isComplete: false,
    });
  });

  // Final step: Flow complete
  steps.push({
    stepIndex: steps.length + 1,
    hopLevel: maxDepth,
    title: "Impact Flow Complete",
    description: `Propagation completed across ${maxDepth} dependency ${
      maxDepth === 1 ? "hop" : "hops"
    }. All ${totalUnique} reachable dependents mapped.`,
    activeNodeIds: [],
    activeEdgeIds: [],
    cumulativeAffectedNodeIds: Array.from(cumulativeNodes),
    cumulativeAffectedEdgeIds: Array.from(cumulativeEdges),
    isOrigin: false,
    isComplete: true,
  });

  return {
    hasVulnerabilities: true,
    summary: {
      vulnerableCount: vulnerableNodes.length,
      directDependentsCount: directCount,
      indirectDependentsCount: indirectCount,
      totalUniqueDependents: totalUnique,
      maxImpactDepth: maxDepth,
    },
    steps,
    shortestDistance,
  };
}
