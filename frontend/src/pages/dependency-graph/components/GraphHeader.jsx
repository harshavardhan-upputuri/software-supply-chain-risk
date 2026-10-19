import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Network, RefreshCw, Layers, ShieldCheck, Share2 } from "lucide-react";
import { EcosystemBadge, StatusBadge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";

export function GraphHeader({
  project,
  graphSummary,
  onOpenRebuildModal,
  onBuildGraph,
  building = false,
}) {
  if (!project) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Link
            to={`/projects/${project.id}`}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Project Details</span>
          </Link>
          <span className="text-slate-300">•</span>
          <EcosystemBadge ecosystem={project.ecosystem} />
          {graphSummary ? (
            <StatusBadge status={graphSummary.status} />
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              Not Built
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>{project.project_name}</span>
          <span className="text-xs font-mono font-normal text-slate-400">
            (ID #{project.id})
          </span>
        </h2>

        {/* Quick graph metrics */}
        {graphSummary && (
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-blue-600" />
              Total Nodes: <strong className="text-slate-900">{graphSummary.total_node_count}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-amber-600" />
              Edges: <strong className="text-slate-900">{graphSummary.edge_count}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Direct: <strong className="text-slate-900">{graphSummary.direct_package_count}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Transitive: <strong className="text-slate-900">{graphSummary.transitive_node_count}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {graphSummary ? (
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            loading={building}
            onClick={onOpenRebuildModal}
          >
            Force Rebuild
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={Network}
            loading={building}
            onClick={() => onBuildGraph(false)}
          >
            Build Graph
          </Button>
        )}
      </div>
    </div>
  );
}

export default GraphHeader;
