import React from "react";
import { Shield, Layers, CornerDownRight, ArrowRight } from "lucide-react";

export function GraphLegend({ isOpen, onToggle }) {
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200 shadow-sm text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Show Legend
      </button>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-3.5 shadow-md text-xs w-64 space-y-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <span className="font-semibold text-slate-900">Dependency Legend</span>
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-600 text-[11px]"
        >
          Hide
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-50 border border-blue-400 flex items-center justify-center">
            <Shield className="w-3 h-3 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-slate-800">Root Package</div>
            <div className="text-[10px] text-slate-400">Directly declared in project</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-400 flex items-center justify-center">
            <Layers className="w-3 h-3 text-emerald-600" />
          </div>
          <div>
            <div className="font-medium text-slate-800">Direct Dependency</div>
            <div className="text-[10px] text-slate-400">1-hop child dependency (Depth 1)</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-slate-50 border border-slate-300 flex items-center justify-center">
            <CornerDownRight className="w-3 h-3 text-slate-500" />
          </div>
          <div>
            <div className="font-medium text-slate-800">Transitive Dependency</div>
            <div className="text-[10px] text-slate-400">Indirect child dependency (Depth 2+)</div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <div className="w-5 flex justify-center text-slate-400">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Directed dependency edge</span>
        </div>
      </div>
    </div>
  );
}

export default GraphLegend;
