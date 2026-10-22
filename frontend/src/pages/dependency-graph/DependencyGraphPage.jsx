import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useNodesState, useEdgesState } from "@xyflow/react";
import useDependencyGraph from "../../hooks/dependency-graph/useDependencyGraph";
import useGraphControls from "../../hooks/dependency-graph/useGraphControls";
import GraphHeader from "./components/GraphHeader";
import GraphCanvas from "../../components/dependency-graph/GraphCanvas";
import RebuildConfirmModal from "./components/RebuildConfirmModal";
import VulnerabilityPanel from "./components/VulnerabilityPanel";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import { graphService } from "../../services/dependency-graph/graphService";

export function DependencyGraphPage() {
  const { id } = useParams();
  const {
    project,
    graphSummary,
    nodes,
    edges,
    layoutMode,
    toggleLayoutMode,
    loading,
    building,
    error,
    refresh,
    triggerBuild,
  } = useDependencyGraph(id);

  const {
    selectedNode,
    setSelectedNode,
    filterQuery,
    setFilterQuery,
    isLegendOpen,
    toggleLegend,
    onNodeClick,
    clearSelection,
  } = useGraphControls();

  const [isRebuildModalOpen, setIsRebuildModalOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Vulnerability analysis states
  const [vulnData, setVulnData] = useState(null);
  const [vulnLoading, setVulnLoading] = useState(false);
  const [vulnError, setVulnError] = useState(null);
  const [isVulnPanelOpen, setIsVulnPanelOpen] = useState(false);
  const [graphViewMode, setGraphViewMode] = useState("normal"); // 'normal' | 'vulnerable'

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

  const handleAnalyzeVulnerabilities = async () => {
    if (vulnLoading) return;
    setVulnLoading(true);
    setVulnError(null);
    try {
      const data = await graphService.analyzeVulnerabilities(id);
      setVulnData(data);
      // Auto-switch to vulnerable graph view to highlight vulnerable nodes
      setGraphViewMode("vulnerable");
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        "Failed to analyze vulnerabilities.";
      setVulnError(message);
    } finally {
      setVulnLoading(false);
    }
  };

  const handleToggleGraphViewMode = async (mode) => {
    if (mode === "vulnerable" && !vulnData && !vulnLoading) {
      // If user toggles to vulnerable view and analysis hasn't run yet, run it
      await handleAnalyzeVulnerabilities();
    } else {
      setGraphViewMode(mode);
    }
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
    <div className="space-y-2">
      {/* Top Header */}
      <GraphHeader
        project={project}
        graphSummary={graphSummary}
        onOpenRebuildModal={() => setIsRebuildModalOpen(true)}
        onBuildGraph={(force) => triggerBuild(force)}
        building={building}
        onAnalyzeVulnerabilities={handleAnalyzeVulnerabilities}
        analyzing={vulnLoading}
        isCollapsed={isHeaderCollapsed}
        onToggleCollapse={() =>
          setIsHeaderCollapsed((previous) => !previous)
        }
      />

      {/* Vulnerability Findings Panel (Collapsible Drawer/Accordion) */}
      {/* <VulnerabilityPanel
        analysisData={vulnData}
        loading={vulnLoading}
        error={vulnError}
        isOpen={isVulnPanelOpen}
        onToggle={() => setIsVulnPanelOpen((prev) => !prev)}
      /> */}

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

      {/* Interactive Graph Canvas with Normal/Vulnerable Toggle */}
      <GraphCanvas
        nodes={flowNodes}
        edges={flowEdges}
        projectName={project.project_name}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        selectedNode={selectedNode}
        onNodeClick={onNodeClick}
        onClearSelection={clearSelection}
        onSelectNodeById={(targetNode) => setSelectedNode(targetNode)}
        filterQuery={filterQuery}
        onFilterChange={setFilterQuery}
        isLegendOpen={isLegendOpen}
        onToggleLegend={toggleLegend}
        onRebuild={() => setIsRebuildModalOpen(true)}
        building={building}
        onBuildGraph={() => triggerBuild(false)}
        layoutMode={layoutMode}
        onToggleLayoutMode={toggleLayoutMode}
        graphViewMode={graphViewMode}
        onToggleGraphViewMode={handleToggleGraphViewMode}
        vulnerabilityData={vulnData}
        analyzingVulnerabilities={vulnLoading}
        onAnalyzeVulnerabilities={handleAnalyzeVulnerabilities}
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
