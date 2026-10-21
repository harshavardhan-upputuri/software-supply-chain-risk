import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { FolderGit2, Layers, CornerDownRight } from "lucide-react";

export const GraphNode = memo(({ data, selected }) => {
  const {
    name = "",
    version = "",
    system = "",
    isOriginal,
    isRoot: isExplicitRoot,
    kind,
    relation,
    depth = 0,
    isSearchActive,
    isSearchMatch,
  } = data;

  // Strict check: Only true project root gets project styling
  const isProjectRoot = kind === "project-root" || isOriginal === true || isExplicitRoot === true;
  const isDirect = !isProjectRoot && (kind === "direct" || depth === 1 || relation === "DIRECT");

  // Default: Transitive
  let cardStyles = "bg-white border-slate-200 text-slate-800 shadow-2xs hover:border-slate-300";
  let avatarStyles = "bg-slate-100 border-slate-200 text-slate-500";
  let badgeStyles = "bg-slate-100 text-slate-600 border-slate-200";
  let icon = <CornerDownRight className="w-3 h-3" />;
  let categoryLabel = `D${depth}`;
  let systemTagStyle = "text-slate-400";
  let nameStyle = "text-slate-800";
  let versionStyle = "text-slate-400";

  if (isProjectRoot) {
    // 1. Project Anchor
    cardStyles = "bg-slate-900 border-2 border-blue-500 text-white shadow-md";
    avatarStyles = "bg-blue-600 border-blue-400 text-white";
    badgeStyles = "bg-blue-600 text-white border-blue-500 font-semibold";
    icon = <FolderGit2 className="w-3 h-3 text-white" />;
    categoryLabel = "PROJECT";
    systemTagStyle = "text-blue-300 font-semibold";
    nameStyle = "text-white font-semibold";
    versionStyle = "text-slate-300";
  } else if (isDirect) {
    // 2. Direct Dependencies
    cardStyles = "bg-emerald-50/70 border-1.5 border-emerald-500 text-slate-900 shadow-2xs";
    avatarStyles = "bg-emerald-600 border-emerald-600 text-white";
    badgeStyles = "bg-emerald-100 text-emerald-800 border-emerald-200 font-medium";
    icon = <Layers className="w-3 h-3 text-white" />;
    categoryLabel = "Direct";
    systemTagStyle = "text-emerald-700 font-semibold";
    nameStyle = "text-slate-900 font-semibold";
    versionStyle = "text-emerald-700/80";
  }

  // Interactive selection states
  let stateClasses = "";
  if (selected) {
    stateClasses = "!ring-2 !ring-blue-600 !border-blue-600 !shadow-md z-30";
  } else if (isSearchMatch) {
    stateClasses = "!ring-2 !ring-amber-500 !border-amber-500 z-20";
  } else if (isSearchActive && !isSearchMatch) {
    stateClasses = "opacity-25 hover:opacity-100 transition-opacity";
  }

  return (
    <div
      className={`relative w-[190px] h-[50px] px-2.5 py-1.5 rounded-lg border transition-all select-none box-border flex flex-col justify-between ${cardStyles} ${stateClasses}`}
    >
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!w-1.5 !h-1.5 !bg-slate-400 !border-white !opacity-40"
      />
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="!w-1.5 !h-1.5 !bg-blue-500 !border-white !opacity-40"
      />

      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${avatarStyles}`}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 leading-none mb-0.5">
            <span className={`text-[9px] uppercase font-mono tracking-wider truncate ${systemTagStyle}`}>
              {system || (isProjectRoot ? "workspace" : "pkg")}
            </span>
            <span className={`text-[8px] px-1 py-0.2 rounded border shrink-0 leading-tight ${badgeStyles}`}>
              {categoryLabel}
            </span>
          </div>

          <div
            className={`text-xs leading-none truncate font-medium ${nameStyle}`}
            title={name}
          >
            {name}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono leading-none pt-0.5 border-t border-slate-100/10">
        <span className={`truncate max-w-[120px] ${versionStyle}`} title={version || "latest"}>
          {isProjectRoot ? "Root Node" : version ? `v${version}` : "latest"}
        </span>
        <span className="opacity-60">{isProjectRoot ? "Root" : `D${depth}`}</span>
      </div>
    </div>
  );
});

GraphNode.displayName = "GraphNode";

export default GraphNode;