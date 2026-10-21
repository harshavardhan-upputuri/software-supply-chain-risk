import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
  X,
  RotateCcw,
} from "lucide-react";

import NodeDetailsPanel from "./NodeDetailsPanel";
import { EmptyState } from "../common/EmptyState";

cytoscape.use(dagre);

const truncateText = (text, maxLength = 22) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};


const stylesheet = [
  // Base node styling
  {
    selector: "node",
    style: {
      label: "data(displayLabel)",
      "text-wrap": "wrap",
      "text-max-width": "190px",
      "text-overflow-wrap": "anywhere",
      "text-valign": "center",
      "text-halign": "center",
      "font-family":
        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "font-size": "11px",
      "font-weight": 500,
      color: "#334155",
      "background-color": "#ffffff",
      "border-width": 1.5,
      "border-color": "#cbd5e1",
      shape: "round-rectangle",
      width: 210,
      height: 54,
      padding: "6px",
      "shadow-blur": 8,
      "shadow-color": "#0f172a",
      "shadow-offset-y": 2,
      "shadow-opacity": 0.08,
      "transition-property":
        "background-color, border-color, line-color, opacity",
      "transition-duration": "0.15s",
    },
  },

  // 1. Repository / Project root
  {
    selector: 'node[kind = "project-root"]',
    style: {
      "background-color": "#172554",
      "border-color": "#2563eb",
      "border-width": 2.5,
      color: "#ffffff",
      "font-weight": 700,
      width: 220,
      height: 58,
      "shadow-blur": 14,
      "shadow-color": "#2563eb",
      "shadow-opacity": 0.2,
    },
  },


  {
    selector: 'node[kind = "project-package"], node[kind = "direct"]',
    style: {
      "background-color": "#ecfdf5",
      "border-color": "#059669",
      "border-width": 2,
      color: "#065f46",
      "font-weight": 600,
    },
  },
  {
    selector: 'node[kind = "transitive"]',
    style: {
      "background-color": "#ffffff",
      "border-color": "#94a3b8",
      "border-width": 1.5,
      color: "#475569",
      "font-weight": 500,
    },
  },


  // Base edge styling: visible directional arrows
  {
    selector: "edge",
    style: {
      width: 2,
      "line-color": "#64748b",
      "target-arrow-color": "#64748b",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1.05,
      "curve-style": "taxi",
      "taxi-direction": "horizontal",
      "taxi-turn": 20,
      "taxi-turn-min-distance": 12,
      opacity: 0.9,
      "line-cap": "round",
      "transition-property": "line-color, target-arrow-color, width, opacity",
      "transition-duration": "0.15s",
    },
  },

  // Repository -> original package
  {
    selector: 'edge[relation = "PROJECT_PACKAGE"]',
    style: {
      width: 2.8,
      "line-color": "#2563eb",
      "target-arrow-color": "#2563eb",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1.2,
      opacity: 1,
    },
  },

  // Direct dependency edges
  {
    selector: 'edge[relation = "DIRECT"]',
    style: {
      width: 2.2,
      "line-color": "#059669",
      "target-arrow-color": "#059669",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1.1,
      opacity: 0.95,
    },
  },

  // Transitive dependency edges
  {
    selector: 'edge[relation = "INDIRECT"], edge[relation = "TRANSITIVE"]',
    style: {
      width: 1.8,
      "line-color": "#64748b",
      "target-arrow-color": "#64748b",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1,
      opacity: 0.85,
    },
  },

  // Fallback for edges without a relation
  {
    selector: 'edge[relation = ""]',
    style: {
      "line-color": "#64748b",
      "target-arrow-color": "#64748b",
    },
  },

  // Hover
  {
    selector: "node:hover",
    style: {
      "border-color": "#2563eb",
      "shadow-blur": 14,
      "shadow-opacity": 0.22,
    },
  },

  // Selected node
  {
    selector: "node.highlighted, node:selected",
    style: {
      "border-color": "#2563eb",
      "border-width": 3,
      "shadow-blur": 18,
      "shadow-color": "#2563eb",
      "shadow-opacity": 0.25,
      "z-index": 999,
    },
  },

  // Edges going out from the selected node
  {
    selector: "edge.highlighted-out",
    style: {
      width: 3,
      "line-color": "#2563eb",
      "target-arrow-color": "#2563eb",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1.3,
      opacity: 1,
      "z-index": 100,
    },
  },

  // Edges coming into the selected node
  {
    selector: "edge.highlighted-in",
    style: {
      width: 3,
      "line-color": "#d97706",
      "target-arrow-color": "#d97706",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1.3,
      opacity: 1,
      "z-index": 100,
    },
  },

  // Dim unrelated nodes and edges
  {
    selector: ".dimmed",
    style: {
      opacity: 0.15,
      "shadow-opacity": 0,
    },
  },

  // Search matches
  {
    selector: "node.search-match",
    style: {
      "border-color": "#d97706",
      "border-width": 3,
      "shadow-blur": 14,
      "shadow-color": "#d97706",
      "shadow-opacity": 0.25,
      "z-index": 500,
    },
  },
];



function buildElements(nodes = [], edges = [], projectName = "Current Project") {
  const elements = [];
  const nodeMap = new Map();
  const aliases = new Map();

  const getPackageKey = (name, version) =>
    `${name || ""}@${version || ""}`;

  const getNodeData = (node) => node?.data || node || {};

  // Resolve a node by its React/Cytoscape ID, backend ID, or package name/version.
  const registerAlias = (alias, elementId) => {
    if (alias !== undefined && alias !== null && String(alias).length > 0) {
      aliases.set(String(alias), elementId);
    }
  };

  const resolveEndpoint = (value, version, name) => {
    if (name) {
      const byName = aliases.get(getPackageKey(name, version));
      if (byName) return byName;
    }

    if (value !== undefined && value !== null) {
      const key = String(value);
      if (nodeMap.has(key)) return key;
      if (aliases.has(key)) return aliases.get(key);
    }

    return null;
  };

  // IMPORTANT:
  // "isOriginal" means the original PACKAGE, not the repository root.
  // Only explicit project-root markers identify a repository node.
  const explicitRoot = nodes.find((node) => {
    const data = getNodeData(node);

    return (
      data.kind === "project-root" ||
      data.kind === "project" ||
      data.isProjectRoot === true ||
      data.is_project_root === true
    );
  });

  const rootId = explicitRoot ? String(explicitRoot.id) : "project__root_anchor";

  // Create a synthetic repository root when the API only returns packages.
  if (!explicitRoot) {
    const safeProjectName = projectName || "Current Project";

    const rootElement = {
      data: {
        id: rootId,
        displayLabel: `${truncateText(safeProjectName, 28)}\nProject Root`,
        name: safeProjectName,
        version: "",
        system: "PROJECT",
        depth: 0,
        relation: "ROOT",
        isOriginal: false,
        isRoot: true,
        isProjectRoot: true,
        kind: "project-root",
      },
    };

    elements.push(rootElement);
    nodeMap.set(rootId, rootElement);
    registerAlias(rootId, rootId);
  }

  // Register all incoming node IDs and package aliases before creating edges.
  nodes.forEach((node) => {
    const data = getNodeData(node);
    const elementId = String(node.id ?? data.id ?? "");

    if (!elementId) return;

    nodeMap.set(elementId, node);
    registerAlias(elementId, elementId);

    if (data.id !== undefined && data.id !== null) {
      registerAlias(data.id, elementId);
    }

    if (data.name) {
      registerAlias(getPackageKey(data.name, data.version), elementId);
    }

    if (node.name) {
      registerAlias(getPackageKey(node.name, node.version), elementId);
    }
  });

  // Create package nodes. The original package remains a package node,
  // positioned one level below the synthetic repository root.
  nodes.forEach((node) => {
    const data = getNodeData(node);
    const id = String(node.id ?? data.id ?? "");

    if (!id) return;

    const isExplicitRoot = explicitRoot && id === rootId;

    if (isExplicitRoot) {
      const name = data.name || projectName || "Current Project";

      elements.push({
        data: {
          id,
          displayLabel: `${truncateText(name, 28)}\nProject Root`,
          name,
          version: data.version || "",
          system: "PROJECT",
          depth: 0,
          relation: "ROOT",
          isOriginal: false,
          isRoot: true,
          isProjectRoot: true,
          kind: "project-root",
        },
      });

      return;
    }

    const packageName = data.name || node.name || id;
    const version = data.version || node.version || "";

    const isOriginalPackage = Boolean(
      data.is_original_project_package ||
      data.isOriginalProjectPackage ||
      data.isOriginal
    );

    // The backend's original package is depth 0. Shift every package down
    // one level to make room for the repository node.
    const apiDepth = Number.isFinite(Number(data.depth))
      ? Number(data.depth)
      : isOriginalPackage
        ? 0
        : 1;

    const displayDepth = Math.max(1, apiDepth + 1);

    const isDirectDependency =
      !isOriginalPackage &&
      (data.relation === "DIRECT" || apiDepth === 1);

    const kind = isOriginalPackage ? "direct" : "transitive";


    const relation = isOriginalPackage ? "PROJECT_PACKAGE" : "INDIRECT";

    const versionText = version
      ? `v${truncateText(version, 14)}`
      : "unpinned";

    elements.push({
      data: {
        id,
        displayLabel: `${truncateText(packageName, 28)}\n${versionText}`,
        name: packageName,
        version,
        system: data.system || node.system || "",
        depth: displayDepth,
        relation,
        isOriginal: false,
        isOriginalPackage,
        isRoot: false,
        isProjectRoot: false,
        kind,
      },
    });
  });

  // Normalize package dependency edges. Supports both:
  // 1. React Flow-style { source, target }
  // 2. API-style { source_name, source_version, target_name, target_version }
  const seenEdgePairs = new Set();

  edges.forEach((edge, index) => {
    const source = resolveEndpoint(
      edge.source,
      edge.source_version,
      edge.source_name
    );

    const target = resolveEndpoint(
      edge.target,
      edge.target_version,
      edge.target_name
    );

    if (!source || !target || source === target) return;

    const pairKey = `${source}->${target}`;

    if (seenEdgePairs.has(pairKey)) return;
    seenEdgePairs.add(pairKey);

    elements.push({
      data: {
        id: String(edge.id || `dependency-edge-${index}-${source}-${target}`),
        source,
        target,
        sourceKind: source === rootId ? "project-root" : "package",
        relation: edge.relation || "",
        requirement: edge.requirement || "",
      },
    });
  });

  // Add Project -> Original Package edges.
  // Do NOT connect the repository directly to every package dependency.
  if (!explicitRoot) {
    nodes.forEach((node) => {
      const data = getNodeData(node);
      const id = String(node.id ?? data.id ?? "");

      const isOriginalPackage = Boolean(
        data.is_original_project_package ||
        data.isOriginalProjectPackage ||
        data.isOriginal
      );

      if (!id || !isOriginalPackage || id === rootId) return;

      const pairKey = `${rootId}->${id}`;

      if (seenEdgePairs.has(pairKey)) return;
      seenEdgePairs.add(pairKey);

      elements.push({
        data: {
          id: `edge-project-root-to-package-${id}`,
          source: rootId,
          target: id,
          sourceKind: "project-root",
          relation: "PROJECT_PACKAGE",
        },
      });
    });
  }

  return elements;
}


export default function GraphCanvas({
  nodes = [],
  edges = [],
  projectName = "My Application",
  selectedNode,
  onNodeClick,
  onClearSelection,
  onSelectNodeById,
  filterQuery = "",
  onFilterChange,
  building = false,
  onBuildGraph,
  onRebuild,
}) {
  const cyRef = useRef(null);
  const [search, setSearch] = useState(filterQuery);
  const [activeNode, setActiveNode] = useState(null);

  const elements = useMemo(() => buildElements(nodes, edges, projectName), [nodes, edges, projectName]);

  useEffect(() => {
    setSearch(filterQuery);
  }, [filterQuery]);

  const runLayout = useCallback((animate = true) => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    cy.layout({
      name: "dagre",
      rankDir: "LR",
      ranker: "network-simplex",
      align: "UL",
      nodeSep: 32,
      edgeSep: 16,
      rankSep: 84,
      padding: 40,
      animate,
      animationDuration: 300,
      fit: true,
    }).run();
  }, []);

  const handleCyReady = (cy) => {
    cyRef.current = cy;

    cy.on("tap", "node", (event) => {
      const element = event.target;
      const data = element.data();

      // Locate original object or supply formatted data for virtual root
      const originalNode =
        nodes.find((n) => String(n.id) === data.id) || {
          id: data.id,
          data: { ...data },
        };

      setActiveNode(originalNode);
      onNodeClick?.(event.originalEvent, originalNode);

      cy.elements().removeClass("dimmed highlighted highlighted-out highlighted-in");
      element.addClass("highlighted");

      const neighborhood = element.closedNeighborhood();
      cy.elements().not(neighborhood).addClass("dimmed");

      element.outgoers("edge").addClass("highlighted-out");
      element.incomers("edge").addClass("highlighted-in");
    });

    cy.on("tap", (event) => {
      if (event.target === cy) {
        cy.elements().removeClass("dimmed highlighted highlighted-out highlighted-in");
        setActiveNode(null);
        onClearSelection?.();
      }
    });

    runLayout(false);
  };

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    const incomingIds = new Set(elements.map((el) => String(el.data.id)));

    cy.elements().forEach((element) => {
      if (!incomingIds.has(element.id())) {
        cy.remove(element);
      }
    });

    elements.forEach((element) => {
      const existing = cy.getElementById(element.data.id);
      if (existing.length) {
        existing.data(element.data);
      } else {
        cy.add(element);
      }
    });

    runLayout(true);
  }, [elements, runLayout]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    const query = search.trim().toLowerCase();
    cy.nodes().removeClass("search-match");

    if (query) {
      cy.nodes().forEach((node) => {
        const matches = node.data("name")?.toLowerCase().includes(query);
        if (matches) node.addClass("search-match");
      });
    }
  }, [search]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    const resizeObserver = new ResizeObserver(() => {
      cy.resize();
    });

    const container = cy.container();
    if (container) resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const zoom = (factor) => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    cy.zoom({
      level: Math.max(0.3, Math.min(2.2, cy.zoom() * factor)),
      renderedPosition: {
        x: cy.width() / 2,
        y: cy.height() / 2,
      },
    });
  };

  const focusAdjacent = (id) => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    const target = cy.getElementById(String(id));
    if (!target.length) return;

    const originalNode = nodes.find((node) => String(node.id) === String(id));
    if (originalNode) {
      setActiveNode(originalNode);
      onSelectNodeById?.(originalNode);
    }

    cy.elements().removeClass("dimmed highlighted highlighted-out highlighted-in");
    target.addClass("highlighted");
    target.closedNeighborhood().nodes().removeClass("dimmed");
    target.outgoers("edge").addClass("highlighted-out");
    target.incomers("edge").addClass("highlighted-in");

    cy.animate({
      center: { eles: target },
      zoom: 1.1,
      duration: 300,
    });
  };

  if (!nodes.length) {
    return (
      <div className="flex h-[560px] items-center justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmptyState
          title="No dependency graph available"
          description="Build the dependency graph to inspect direct and transitive packages."
          icon={Network}
          actionLabel={building ? "Building graph..." : "Build dependency graph"}
          onAction={onBuildGraph}
        />
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-3.5 py-2.5">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              onFilterChange?.(event.target.value);
            }}
            placeholder="Filter package name..."
            className="w-full rounded-md border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-8 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                onFilterChange?.("");
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => zoom(1.2)}
            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            title="Zoom in"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => zoom(0.8)}
            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            title="Zoom out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => runLayout(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            title="Fit graph to viewport"
          >
            <Maximize2 size={13} />
            <span>Fit</span>
          </button>
          {onRebuild && (
            <button
              disabled={building}
              onClick={onRebuild}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <RotateCcw size={12} className={building ? "animate-spin" : ""} />
              <span>{building ? "Rebuilding..." : "Rebuild"}</span>
            </button>
          )}
        </div>
      </div>




      {/* Legend & Stats */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 text-xs">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border-2 border-blue-600 bg-slate-900" />
          <span className="font-semibold text-slate-800">Project Root</span>
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border-2 border-emerald-600 bg-emerald-50" />
          <span className="font-medium text-emerald-800">Direct Dependencies</span>
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-slate-400 bg-white" />
          <span className="font-medium text-slate-600">Indirect Dependencies</span>
        </span>

        <span className="ml-auto font-mono text-[11px] text-slate-500">
          {elements.filter((el) => !el.data.source).length} nodes
          {" · "}
          {elements.filter((el) => Boolean(el.data.source)).length} edges
        </span>
      </div>



      {/* Canvas */}
      <div
        className="relative h-[600px] w-full bg-slate-50/50"
        style={{
          backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        <CytoscapeComponent
          elements={elements}
          stylesheet={stylesheet}
          cy={handleCyReady}
          layout={{
            name: "dagre",
            rankDir: "LR",
            nodeSep: 32,
            rankSep: 84,
            padding: 40,
            fit: true,
          }}
          minZoom={0.25}
          maxZoom={2.2}
          wheelSensitivity={0.15}
          boxSelectionEnabled={false}
          style={{ width: "100%", height: "100%" }}
        />

        {activeNode && (
          <div className="absolute bottom-3 right-3 top-3 z-10 w-[min(360px,calc(100%-24px))] overflow-hidden rounded-xl shadow-xl ring-1 ring-slate-900/10">
            <NodeDetailsPanel
              node={activeNode}
              edges={elements
                .filter((el) => el.data.source && el.data.target)
                .map((el) => el.data)}
              onClose={() => {
                setActiveNode(null);
                onClearSelection?.();
                cyRef.current
                  ?.elements()
                  .removeClass("dimmed highlighted highlighted-out highlighted-in");
              }}
              onSelectNode={focusAdjacent}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-white px-3.5 py-1.5 text-xs text-slate-500">
        <span>Click any node to focus its direct relationships.</span>
        <span className="font-mono text-[11px] text-slate-400">Scroll to zoom · Drag to pan</span>
      </div>
    </section>
  );
}