import React from "react";
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Layers,
  Network,
  GitGraph,
  X,
} from "lucide-react";
import { Button } from "../common/Button";
import { LAYOUT_MODES } from "../../services/dependency-graph/graphTransformers";

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  filterQuery,
  onFilterChange,
  matchCount = null,
  isLegendOpen,
  onToggleLegend,
  onRebuild,
  building = false,
  layoutMode = LAYOUT_MODES.FORCE,
  onToggleLayoutMode,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-xs">
      {/* Search Input */}
      <div className="relative min-w-[190px] sm:min-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter package names..."
          className="w-full rounded-md border border-slate-200 bg-slate-50/70 py-1 pl-8 pr-14 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {filterQuery && (
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {typeof matchCount === "number" && (
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 font-mono text-[10px] font-medium text-slate-700">
                {matchCount}
              </span>
            )}
            <button
              onClick={() => onFilterChange("")}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="hidden h-4 w-px bg-slate-200 sm:block" />

      {/* Navigation Controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onZoomIn}
          className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          title="Zoom In"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onZoomOut}
          className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          title="Zoom Out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onFitView}
          className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          title="Fit view to screen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="hidden h-4 w-px bg-slate-200 sm:block" />

      {/* Layout Mode Toggle */}
      {onToggleLayoutMode && (
        <button
          onClick={onToggleLayoutMode}
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
            layoutMode === LAYOUT_MODES.FORCE
              ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
          }`}
          title={`Layout: ${
            layoutMode === LAYOUT_MODES.FORCE ? "Force-Directed" : "Hierarchical"
          }`}
        >
          {layoutMode === LAYOUT_MODES.FORCE ? (
            <>
              <Network className="h-3.5 w-3.5 text-blue-600" />
              <span>Network</span>
            </>
          ) : (
            <>
              <GitGraph className="h-3.5 w-3.5 text-purple-600" />
              <span>Layered</span>
            </>
          )}
        </button>
      )}

      {/* Legend Toggle */}
      <button
        onClick={onToggleLegend}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
          isLegendOpen
            ? "border-slate-300 bg-slate-100 text-slate-900"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Layers className="h-3.5 w-3.5 text-slate-500" />
        <span>Legend</span>
      </button>

      {/* Rebuild Trigger */}
      {onRebuild && (
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          loading={building}
          onClick={onRebuild}
          title="Rebuild graph from manifest"
        >
          Rebuild
        </Button>
      )}
    </div>
  );
}

export default GraphControls;