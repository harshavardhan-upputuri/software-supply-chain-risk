import React from "react";
import { Search, ZoomIn, ZoomOut, Maximize2, RefreshCw, Layers } from "lucide-react";
import { Button } from "../common/Button";

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  filterQuery,
  onFilterChange,
  isLegendOpen,
  onToggleLegend,
  onRebuild,
  building = false,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
      {/* Search Filter */}
      <div className="relative min-w-[180px] sm:min-w-[220px]">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter package names..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
        />
      </div>

      <div className="h-4 w-px bg-slate-200 hidden sm:block" />

      {/* Zoom / Pan Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomIn}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={onFitView}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <div className="h-4 w-px bg-slate-200 hidden sm:block" />

      {/* Legend toggle */}
      <button
        onClick={onToggleLegend}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          isLegendOpen
            ? "bg-slate-100 border-slate-300 text-slate-800"
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Layers className="w-3.5 h-3.5 text-slate-500" />
        <span>Legend</span>
      </button>

      {/* Force Rebuild Action */}
      {onRebuild && (
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          loading={building}
          onClick={onRebuild}
          title="Re-query deps.dev and rebuild graph"
        >
          Rebuild Graph
        </Button>
      )}
    </div>
  );
}

export default GraphControls;
