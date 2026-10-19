import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useNodesState, useEdgesState } from "@xyflow/react";
import useDependencyGraph from "../../hooks/dependency-graph/useDependencyGraph";
import useGraphControls from "../../hooks/dependency-graph/useGraphControls";
import GraphHeader from "./components/GraphHeader";
import GraphCanvas from "../../components/dependency-graph/GraphCanvas";
import RebuildConfirmModal from "./components/RebuildConfirmModal";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";

export function DependencyGraphPage() {
  const { id } = useParams();
  const {
    project,
    graphSummary,
    nodes,
    edges,
    loading,
    building,
    error,
    refresh,
    triggerBuild,
  } = useDependencyGraph(id);

  const {
    selectedNode,
    filterQuery,
    setFilterQuery,
    isLegendOpen,
    toggleLegend,
    onNodeClick,
    clearSelection,
  } = useGraphControls();

  const [isRebuildModalOpen, setIsRebuildModalOpen] = useState(false);

  // Hook for ReactFlow internal node/edge position dragging
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Sync internal flow state whenever nodes/edges change from hook
  React.useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  React.useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

  const handleConfirmRebuild = async () => {
    setIsRebuildModalOpen(false);
    await triggerBuild(true);
  };

  if (loading) {
    return <LoadingState message="Loading dependency graph from database..." />;
  }

  if (error && !project) {
    return (
      <ErrorState
        title="Failed to Load Project"
        message={error}
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <GraphHeader
        project={project}
        graphSummary={graphSummary}
        onOpenRebuildModal={() => setIsRebuildModalOpen(true)}
        onBuildGraph={(force) => triggerBuild(force)}
        building={building}
      />

      {/* Build Error Alert if any */}
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => triggerBuild(false)}
            className="font-semibold underline hover:text-amber-900"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Interactive Graph Canvas */}
      <GraphCanvas
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        selectedNode={selectedNode}
        onNodeClick={onNodeClick}
        onClearSelection={clearSelection}
        filterQuery={filterQuery}
        onFilterChange={setFilterQuery}
        isLegendOpen={isLegendOpen}
        onToggleLegend={toggleLegend}
        onRebuild={() => setIsRebuildModalOpen(true)}
        building={building}
        onBuildGraph={() => triggerBuild(false)}
      />

      {/* Force Rebuild Confirmation Dialog */}
      <RebuildConfirmModal
        isOpen={isRebuildModalOpen}
        onClose={() => setIsRebuildModalOpen(false)}
        onConfirm={handleConfirmRebuild}
        loading={building}
        projectName={project?.project_name}
      />
    </div>
  );
}

export default DependencyGraphPage;
