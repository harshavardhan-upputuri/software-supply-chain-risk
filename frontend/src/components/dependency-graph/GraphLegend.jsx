import React from "react";
import { FolderGit2, Layers, CornerDownRight, ArrowRight } from "lucide-react";

export function GraphLegend({ isOpen, onToggle }) {
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
      >
        Show Legend
      </button>
    );
  }

  return (
    <div className="w-64 select-none space-y-2.5 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-md backdrop-blur-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <span className="font-semibold text-slate-900">Dependency Legend</span>
        <button
          onClick={onToggle}
          className="text-[11px] text-slate-400 hover:text-slate-600"
        >
          Hide
        </button>
      </div>

      <div className="space-y-2">
        {/* 1. Main Project Root */}
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-blue-500 bg-slate-900">
            <FolderGit2 className="h-3 w-3 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 leading-tight">Project Node</div>
            <div className="text-[10px] text-slate-400">Anchor project workspace</div>
          </div>
        </div>

        {/* 2. Direct Dependencies */}
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-emerald-500 bg-emerald-50">
            <Layers className="h-3 w-3 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-emerald-900 leading-tight">Direct Dependencies</div>
            <div className="text-[10px] text-slate-400">Explicitly imported in project</div>
          </div>
        </div>

        {/* 3. Transitive Dependencies */}
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white">
            <CornerDownRight className="h-3 w-3 text-slate-500" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-slate-800 leading-tight">Transitive Dependencies</div>
            <div className="text-[10px] text-slate-400">Sub-dependencies of packages</div>
          </div>
        </div>

        {/* Edges */}
        <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3 stroke-[2.5] text-blue-600 shrink-0" />
            <span className="text-blue-700 font-medium">Outgoing (Depends on)</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3 stroke-[2.5] text-emerald-600 shrink-0" />
            <span className="text-emerald-700 font-medium">Incoming (Required by)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraphLegend;