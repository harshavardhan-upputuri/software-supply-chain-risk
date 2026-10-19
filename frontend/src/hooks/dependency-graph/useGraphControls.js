import { useState, useCallback } from "react";

export function useGraphControls() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const toggleLegend = useCallback(() => {
    setIsLegendOpen((prev) => !prev);
  }, []);

  return {
    selectedNode,
    setSelectedNode,
    filterQuery,
    setFilterQuery,
    isLegendOpen,
    toggleLegend,
    onNodeClick,
    clearSelection,
  };
}

export default useGraphControls;
