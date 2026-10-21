/**
 * High-performance graph transformers for Software Supply Chain Dependency Graphs.
 * Transforms backend API responses into @xyflow/react compatible nodes and edges.
 *
 * Implements:
 * 1. Genuine Force-Directed Network Layout (using d3-force: forceLink, forceManyBody,
 *    forceCollide, forceCenter, forceX, forceY) — spread naturally across the canvas
 *    like an authentic dependency web (inspired by WinGraph/Cytoscape networks).
 * 2. Balanced Layered Hierarchy Layout — compact multi-column depth flow as alternative.
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceX,
  forceY,
} from "d3-force";

export const LAYOUT_MODES = {
  FORCE: "force",
  LAYERED: "layered",
};

/**
 * Transforms raw nodes and edges into positioned @xyflow/react nodes and directional edges.
 *
 * @param {Array} rawNodes - Array of raw node objects from backend API
 * @param {Array} rawEdges - Array of raw edge objects from backend API
 * @param {Object} options - Configuration options (layoutMode, selectedNodeId, filterQuery)
 * @returns {Object} { nodes: Array, edges: Array, nodeMap: Map }
 */
export function transformGraphData(rawNodes = [], rawEdges = [], options = {}) {
  if (!rawNodes || rawNodes.length === 0) {
    return { nodes: [], edges: [], nodeMap: new Map() };
  }

  const { layoutMode = LAYOUT_MODES.FORCE, selectedNodeId = null, filterQuery = "" } = options;

  // 1. Index nodes and group by depth
  const nodeMap = new Map();
  const depthGroups = new Map();

  rawNodes.forEach((node) => {
    const key = `${node.name}@${node.version || ""}`;
    const depth = typeof node.depth === "number" ? node.depth : (node.is_original_project_package ? 0 : 1);
    const isOriginal = Boolean(node.is_original_project_package) || depth === 0;

    const normalizedNode = {
      ...node,
      key,
      depth,
      isOriginal,
    };

    nodeMap.set(key, normalizedNode);

    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth).push(normalizedNode);
  });

  // Build adjacency maps for topological graph traversal and connection analysis
  const outgoingAdjacency = new Map();
  const incomingAdjacency = new Map();

  rawEdges.forEach((edge) => {
    const sourceKey = `${edge.source_name}@${edge.source_version || ""}`;
    const targetKey = `${edge.target_name}@${edge.target_version || ""}`;

    if (!outgoingAdjacency.has(sourceKey)) outgoingAdjacency.set(sourceKey, []);
    outgoingAdjacency.get(sourceKey).push(targetKey);

    if (!incomingAdjacency.has(targetKey)) incomingAdjacency.set(targetKey, []);
    incomingAdjacency.get(targetKey).push(sourceKey);
  });

  // Compute node positions based on selected layout mode
  const positions =
    layoutMode === LAYOUT_MODES.LAYERED
      ? computeLayeredPositions(rawNodes, depthGroups, incomingAdjacency)
      : computeForceDirectedNetworkPositions(rawNodes, rawEdges, outgoingAdjacency);

  // 2. Build React Flow Nodes
  const q = (filterQuery || "").trim().toLowerCase();
  const isSearchActive = q.length > 0;

  const flowNodes = rawNodes.map((node) => {
    const key = `${node.name}@${node.version || ""}`;
    const depth = typeof node.depth === "number" ? node.depth : (node.is_original_project_package ? 0 : 1);
    const isOriginal = Boolean(node.is_original_project_package) || depth === 0;
    const pos = positions.get(key) || { x: 0, y: 0 };

    const isSearchMatch = isSearchActive && node.name.toLowerCase().includes(q);

    return {
      id: key,
      type: "dependencyNode",
      position: pos,
      data: {
        id: node.id,
        name: node.name,
        version: node.version,
        system: node.system,
        isOriginal,
        relation: node.relation || (isOriginal ? "ROOT" : depth === 1 ? "DIRECT" : "TRANSITIVE"),
        depth,
        isSearchActive,
        isSearchMatch,
      },
    };
  });

  // 3. Build React Flow Edges with dynamic directional handles and styling
  const flowEdges = [];
  const seenEdges = new Set();

  rawEdges.forEach((edge, idx) => {
    const sourceKey = `${edge.source_name}@${edge.source_version || ""}`;
    const targetKey = `${edge.target_name}@${edge.target_version || ""}`;
    const edgePairKey = `${sourceKey}->${targetKey}`;

    if (seenEdges.has(edgePairKey)) return;
    seenEdges.add(edgePairKey);

    const sourcePos = positions.get(sourceKey) || { x: 0, y: 0 };
    const targetPos = positions.get(targetKey) || { x: 0, y: 0 };

    // Select the optimal directional handle on source and target to minimize edge crossings & bends
    const { sourceHandle, targetHandle } = computeOptimalHandles(sourcePos, targetPos);

    const isOutgoingFromSelected = selectedNodeId === sourceKey;
    const isIncomingToSelected = selectedNodeId === targetKey;
    const isConnectedToSelected = isOutgoingFromSelected || isIncomingToSelected;

    let stroke = "#94a3b8";
    let strokeWidth = 1.5;
    let opacity = 0.65;
    let animated = false;
    let markerColor = "#94a3b8";
    let zIndex = 1;

    if (selectedNodeId) {
      if (isOutgoingFromSelected) {
        stroke = "#2563eb"; // Deep blue for dependencies of selected node
        strokeWidth = 2.5;
        opacity = 1;
        animated = true;
        markerColor = "#2563eb";
        zIndex = 20;
      } else if (isIncomingToSelected) {
        stroke = "#059669"; // Emerald for packages requiring selected node
        strokeWidth = 2.5;
        opacity = 1;
        animated = true;
        markerColor = "#059669";
        zIndex = 20;
      } else {
        stroke = "#cbd5e1";
        strokeWidth = 1;
        opacity = 0.15;
        markerColor = "#cbd5e1";
        zIndex = 0;
      }
    }

    flowEdges.push({
      id: `edge-${sourceKey}->${targetKey}-${idx}`,
      source: sourceKey,
      target: targetKey,
      sourceHandle,
      targetHandle,
      type: "straight", // Clean straight directional lines for authentic network constellation
      animated,
      zIndex,
      markerEnd: {
        type: "arrowclosed",
        width: 14,
        height: 14,
        color: markerColor,
      },
      style: {
        stroke,
        strokeWidth,
        opacity,
      },
      data: {
        requirement: edge.requirement || "",
        relation: edge.relation || "",
        isConnectedToSelected,
      },
    });
  });

  return { nodes: flowNodes, edges: flowEdges, nodeMap };
}

/**
 * Computes a genuine force-directed network layout using d3-force.
 * Nodes naturally distribute across the 2D plane according to graph connectivity,
 * with connected packages clustered organically and unrelated packages pushed apart.
 *
 * NO artificial concentric circles or fixed depth rings.
 */
function computeForceDirectedNetworkPositions(rawNodes, rawEdges, outgoingAdjacency) {
  const positions = new Map();
  const totalNodes = rawNodes.length;

  if (totalNodes === 1) {
    const key = `${rawNodes[0].name}@${rawNodes[0].version || ""}`;
    positions.set(key, { x: 0, y: 0 });
    return positions;
  }

  // 1. Prepare simulation nodes with deterministic BFS initial coordinates
  const simNodes = [];
  const nodeKeyToSimNode = new Map();

  rawNodes.forEach((node, idx) => {
    const key = `${node.name}@${node.version || ""}`;
    const depth = typeof node.depth === "number" ? node.depth : (node.is_original_project_package ? 0 : 1);
    const isOriginal = Boolean(node.is_original_project_package) || depth === 0;

    const simNode = {
      id: key,
      name: node.name,
      depth,
      isOriginal,
      index: idx,
      x: 0,
      y: 0,
    };
    simNodes.push(simNode);
    nodeKeyToSimNode.set(key, simNode);
  });

  // Prepare simulation links
  const simLinks = [];
  rawEdges.forEach((edge) => {
    const s = `${edge.source_name}@${edge.source_version || ""}`;
    const t = `${edge.target_name}@${edge.target_version || ""}`;
    if (nodeKeyToSimNode.has(s) && nodeKeyToSimNode.has(t)) {
      simLinks.push({ source: s, target: t });
    }
  });

  // 2. Deterministic topological BFS seeding:
  // Root nodes placed at center; children seeded outward in the direction of their parents
  const rootNodes = simNodes.filter((n) => n.isOriginal || n.depth === 0);
  const visited = new Set();
  const queue = [];

  // Anchor root packages around the center
  const rootCount = rootNodes.length;
  rootNodes.forEach((root, idx) => {
    root.x = rootCount > 1 ? (idx - (rootCount - 1) / 2) * 160 : 0;
    root.y = 0;
    visited.add(root.id);
    queue.push(root);
  });

  // Breadth-first placement of connected packages
  const initialStep = totalNodes <= 6 ? 240 : totalNodes <= 15 ? 200 : 180;

  while (queue.length > 0) {
    const parent = queue.shift();
    const childrenKeys = (outgoingAdjacency.get(parent.id) || []).filter((k) => !visited.has(k));
    const k = childrenKeys.length;

    childrenKeys.forEach((childKey, i) => {
      visited.add(childKey);
      const child = nodeKeyToSimNode.get(childKey);
      if (!child) return;

      // Deterministic fan angle around parent
      const parentAngle = Math.atan2(parent.y, parent.x) || 0;
      const spreadAngle = k > 1 ? ((i / (k - 1)) - 0.5) * Math.PI * 1.3 : 0;
      const angle = (parent.x === 0 && parent.y === 0)
        ? (i * 2 * Math.PI) / Math.max(k, 1) - Math.PI / 2
        : parentAngle + spreadAngle;

      child.x = parent.x + initialStep * Math.cos(angle);
      child.y = parent.y + initialStep * Math.sin(angle);
      queue.push(child);
    });
  }

  // Any unreached nodes (e.g. disconnected components or extra manifests)
  simNodes.forEach((n, idx) => {
    if (!visited.has(n.id)) {
      const angle = (idx * 2.39996); // Golden angle distribution
      const r = 220 + idx * 30;
      n.x = r * Math.cos(angle);
      n.y = r * Math.sin(angle);
      visited.add(n.id);
    }
  });

  // 3. Dynamic Physics Tuning:
  // Scales link distance and repulsive force based on graph size to guarantee
  // the network fills the canvas comfortably without cramming or overflowing
  const linkDistance = totalNodes <= 4 ? 240 : totalNodes <= 10 ? 210 : totalNodes <= 20 ? 190 : 175;
  const chargeStrength = totalNodes <= 4 ? -1200 : totalNodes <= 10 ? -1500 : totalNodes <= 20 ? -1800 : -2000;
  const collideRadius = 120; // Accommodates 210px x 60px node cards with safe margin

  // Configure genuine d3-force physics simulation (NO forceRadial)
  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink(simLinks)
        .id((d) => d.id)
        .distance(linkDistance)
        .strength(0.75)
    )
    .force("charge", forceManyBody().strength(chargeStrength))
    .force("collide", forceCollide().radius(collideRadius).iterations(3))
    .force("center", forceCenter(0, 0))
    .force("x", forceX(0).strength(0.035))
    .force("y", forceY(0).strength(0.035))
    .stop(); // Synchronous tick execution — 100% deterministic, zero canvas flicker

  // Run fixed synchronous ticks (180 ticks executes in ~20-35ms)
  const tickCount = totalNodes > 40 ? 140 : 180;
  for (let i = 0; i < tickCount; i++) {
    simulation.tick();
  }

  // 4. Output computed coordinates
  simNodes.forEach((node) => {
    positions.set(node.id, {
      x: Math.round(node.x),
      y: Math.round(node.y),
    });
  });

  return positions;
}

/**
 * Computes a balanced, compact multi-column layered hierarchy.
 * Available as an alternative layout mode via the controls toggle.
 */
function computeLayeredPositions(rawNodes, depthGroups, incomingAdjacency) {
  const positions = new Map();
  const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b);

  const LEVEL_X_SPACING = 340;
  const NODE_Y_SPACING = 95;
  const MAX_PER_COLUMN = 8; // Wrap columns when a depth exceeds 8 nodes

  let currentX = 80;

  sortedDepths.forEach((depth) => {
    const nodesAtDepth = depthGroups.get(depth) || [];
    // Sort deterministically: group siblings by primary parent
    const sortedNodes = [...nodesAtDepth].sort((a, b) => {
      const pA = incomingAdjacency.get(a.key)?.[0] || "";
      const pB = incomingAdjacency.get(b.key)?.[0] || "";
      if (pA !== pB) return pA.localeCompare(pB);
      return a.name.localeCompare(b.name);
    });

    const count = sortedNodes.length;
    const columnsCount = Math.ceil(count / MAX_PER_COLUMN);

    for (let col = 0; col < columnsCount; col++) {
      const colNodes = sortedNodes.slice(col * MAX_PER_COLUMN, (col + 1) * MAX_PER_COLUMN);
      const colX = currentX + col * 260;
      const totalColHeight = (colNodes.length - 1) * NODE_Y_SPACING;
      const startY = -totalColHeight / 2 + 200;

      colNodes.forEach((node, idx) => {
        positions.set(node.key, {
          x: Math.round(colX),
          y: Math.round(startY + idx * NODE_Y_SPACING),
        });
      });
    }

    currentX += columnsCount * 260 + (LEVEL_X_SPACING - 260);
  });

  return positions;
}

/**
 * Selects the optimal source and target handles based on relative geometric angle,
 * ensuring straight directional lines connect between the closest card boundaries.
 */
function computeOptimalHandles(sourcePos, targetPos) {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return { sourceHandle: "right-source", targetHandle: "left-target" };
    } else {
      return { sourceHandle: "left-source", targetHandle: "right-target" };
    }
  } else {
    if (dy >= 0) {
      return { sourceHandle: "bottom-source", targetHandle: "top-target" };
    } else {
      return { sourceHandle: "top-source", targetHandle: "bottom-target" };
    }
  }
}

export default transformGraphData;
