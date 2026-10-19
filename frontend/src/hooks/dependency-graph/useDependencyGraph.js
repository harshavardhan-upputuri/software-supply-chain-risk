import { useState, useEffect, useCallback } from "react";
import graphService from "../../services/dependency-graph/graphService";
import { transformGraphData } from "../../services/dependency-graph/graphTransformers";

export function useDependencyGraph(projectId) {
  const [project, setProject] = useState(null);
  const [graphSummary, setGraphSummary] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [nodeMap, setNodeMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState(null);

  const loadGraph = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch project metadata
      const projectData = await graphService.getProject(projectId);
      setProject(projectData);

      // 2. Fetch project dependency graph
      try {
        const graphData = await graphService.getDependencyGraph(projectId, {
          nodesPage: 1,
          nodesPageSize: 200,
          edgesPage: 1,
          edgesPageSize: 200,
        });

        setGraphSummary(graphData.graph);
        const { nodes: flowNodes, edges: flowEdges, nodeMap: map } = transformGraphData(
          graphData.nodes?.results || [],
          graphData.edges?.results || []
        );
        setNodes(flowNodes);
        setEdges(flowEdges);
        setNodeMap(map);
      } catch (err) {
        if (err.status === 404) {
          // Graph has not been built yet
          setGraphSummary(null);
          setNodes([]);
          setEdges([]);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load project or dependency graph");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const triggerBuild = useCallback(async (forceRebuild = false) => {
    if (!projectId) return;
    setBuilding(true);
    setError(null);

    try {
      await graphService.buildDependencyGraph(projectId, forceRebuild);
      await loadGraph();
    } catch (err) {
      setError(err.message || "Failed to construct dependency graph");
    } finally {
      setBuilding(false);
    }
  }, [projectId, loadGraph]);

  return {
    project,
    graphSummary,
    nodes,
    edges,
    nodeMap,
    loading,
    building,
    error,
    refresh: loadGraph,
    triggerBuild,
    setNodes,
    setEdges,
  };
}

export default useDependencyGraph;
