/** Transforms backend graph data into @xyflow/react compatible nodes and edges */

export function transformGraphData(rawNodes = [], rawEdges = []) {
  if (!rawNodes || rawNodes.length === 0) {
    return { nodes: [], edges: [], nodeMap: new Map() };
  }

  // 1. Group nodes by depth for layered hierarchical layout
  const depthGroups = new Map();
  const nodeMap = new Map();

  rawNodes.forEach((node) => {
    const key = `${node.name}@${node.version || ""}`;
    const depth = typeof node.depth === "number" ? node.depth : (node.is_original_project_package ? 0 : 1);
    
    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth).push(node);
    nodeMap.set(key, node);
  });

  // Sort depths
  const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b);

  const HORIZONTAL_SPACING = 300;
  const VERTICAL_SPACING = 170;

  const flowNodes = [];

  sortedDepths.forEach((depth, levelIndex) => {
    const nodesAtDepth = depthGroups.get(depth);
    const totalAtLevel = nodesAtDepth.length;
    const startX = -((totalAtLevel - 1) * HORIZONTAL_SPACING) / 2;

    nodesAtDepth.forEach((node, idx) => {
      const key = `${node.name}@${node.version || ""}`;
      const posX = startX + idx * HORIZONTAL_SPACING + 400; // offset centering
      const posY = levelIndex * VERTICAL_SPACING + 80;

      flowNodes.push({
        id: key,
        type: "dependencyNode",
        position: { x: posX, y: posY },
        data: {
          id: node.id,
          name: node.name,
          version: node.version,
          system: node.system,
          isOriginal: Boolean(node.is_original_project_package),
          relation: node.relation || (node.is_original_project_package ? "ROOT" : "DIRECT"),
          depth: depth,
        },
      });
    });
  });

  // 2. Transform edges
  const flowEdges = [];
  const seenEdges = new Set();

  rawEdges.forEach((edge, idx) => {
    const sourceKey = `${edge.source_name}@${edge.source_version || ""}`;
    const targetKey = `${edge.target_name}@${edge.target_version || ""}`;
    const edgeId = `edge-${sourceKey}->${targetKey}-${idx}`;

    if (!seenEdges.has(`${sourceKey}->${targetKey}`)) {
      seenEdges.add(`${sourceKey}->${targetKey}`);

      flowEdges.push({
        id: edgeId,
        source: sourceKey,
        target: targetKey,
        type: "smoothstep",
        animated: false,
        markerEnd: {
          type: "arrowclosed",
          width: 16,
          height: 16,
          color: "#94a3b8",
        },
        style: {
          stroke: "#cbd5e1",
          strokeWidth: 2,
        },
        data: {
          requirement: edge.requirement || "",
          relation: edge.relation || "",
        },
      });
    }
  });

  return { nodes: flowNodes, edges: flowEdges, nodeMap };
}
