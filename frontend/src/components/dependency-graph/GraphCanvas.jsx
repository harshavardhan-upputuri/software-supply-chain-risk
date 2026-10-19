import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import GraphNode from "./GraphNode";
import GraphControls from "./GraphControls";
import GraphLegend from "./GraphLegend";
import NodeDetailsPanel from "./NodeDetailsPanel";
import { EmptyState } from "../common/EmptyState";
import { Network } from "lucide-react";

// Register custom node types outside component to prevent re-renders
const nodeTypes = {
  dependencyNode: GraphNode,
};

function InnerGraphCanvas({
  nodes = [],
  edges = [],
  onNodesChange,
  onEdgesChange,
  selectedNode,
  onNodeClick,
  onClearSelection,
  filterQuery = "",
  onFilterChange,
  isLegendOpen = true,
  onToggleLegend,
  onRebuild = null,
  building = false,
  onBuildGraph = null,
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // Highlight nodes matching search filter
  const displayedNodes = useMemo(() => {
    if (!filterQuery || !filterQuery.trim()) {
      return nodes;
    }
    const q = filterQuery.toLowerCase();
    return nodes.map((node) => {
      const match = node.data.name?.toLowerCase().includes(q);
      return {
        ...node,
        style: {
          ...node.style,
          opacity: match ? 1 : 0.25,
        },
      };
    });
  }, [nodes, filterQuery]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="w-full h-[600px] bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center p-6">
        <EmptyState
          title="No Dependency Graph Built"
          description="A dependency graph has not yet been generated for this project. Trigger graph resolution to inspect direct and transitive dependencies."
          icon={Network}
          actionLabel={building ? "Resolving Dependencies..." : "Build Dependency Graph"}
          onAction={onBuildGraph}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[680px] bg-slate-50/70 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <GraphControls
          onZoomIn={() => zoomIn({ duration: 300 })}
          onZoomOut={() => zoomOut({ duration: 300 })}
          onFitView={() => fitView({ padding: 0.2, duration: 400 })}
          filterQuery={filterQuery}
          onFilterChange={onFilterChange}
          isLegendOpen={isLegendOpen}
          onToggleLegend={onToggleLegend}
          onRebuild={onRebuild}
          building={building}
        />
      </div>

      {/* Top Right Legend */}
      <div className="absolute top-4 right-4 z-10">
        <GraphLegend isOpen={isLegendOpen} onToggle={onToggleLegend} />
      </div>

      {/* Selected Node Details Side Panel */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-20">
          <NodeDetailsPanel
            node={selectedNode}
            edges={edges}
            onClose={onClearSelection}
          />
        </div>
      )}

      {/* React Flow Viewport */}
      <ReactFlow
        nodes={displayedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onClearSelection}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#94a3b8" gap={20} size={1} />
        <MiniMap
          nodeColor={(n) => {
            if (n.data?.isOriginal) return "#2563eb";
            if (n.data?.depth === 1) return "#10b981";
            return "#64748b";
          }}
          maskColor="rgba(241, 245, 249, 0.7)"
          className="!bottom-4 !left-4"
        />
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas(props) {
  return (
    <ReactFlowProvider>
      <InnerGraphCanvas {...props} />
    </ReactFlowProvider>
  );
}

export default GraphCanvas;
