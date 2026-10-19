import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Package, Shield, Layers, CornerDownRight } from "lucide-react";

export const GraphNode = memo(({ data, selected }) => {
  const { name, version, system, isOriginal, relation, depth } = data;

  // Determine styling based on whether it is root/original, direct, or transitive
  let borderStyle = "border-slate-200 bg-white shadow-xs";
  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
  let icon = <Package className="w-3.5 h-3.5 text-slate-500" />;
  let categoryLabel = "Transitive";

  if (isOriginal || depth === 0) {
    borderStyle = "border-blue-500 bg-blue-50/40 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30";
    badgeColor = "bg-blue-600 text-white border-blue-600 font-semibold";
    icon = <Shield className="w-3.5 h-3.5 text-blue-600" />;
    categoryLabel = "Root Package";
  } else if (depth === 1 || relation === "DIRECT") {
    borderStyle = "border-emerald-400 bg-emerald-50/30 shadow-xs ring-1 ring-emerald-400/20";
    badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
    icon = <Layers className="w-3.5 h-3.5 text-emerald-600" />;
    categoryLabel = "Direct";
  } else {
    borderStyle = "border-slate-300 bg-white";
    badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
    icon = <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />;
    categoryLabel = `Transitive (D${depth})`;
  }

  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl border transition-all duration-150 min-w-[200px] max-w-[260px] ${borderStyle} ${
        selected ? "ring-2 ring-blue-600 shadow-md !border-blue-600 scale-[1.02]" : "hover:shadow-md"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white"
      />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {icon}
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            {system}
          </span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badgeColor}`}>
          {categoryLabel}
        </span>
      </div>

      {/* Package Name */}
      <div className="font-semibold text-xs text-slate-900 truncate" title={name}>
        {name}
      </div>

      {/* Version & Depth */}
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span className="truncate" title={version || "latest"}>
          v{version || "latest"}
        </span>
        <span className="text-[10px] text-slate-400">Depth: {depth}</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
});

GraphNode.displayName = "GraphNode";

export default GraphNode;
