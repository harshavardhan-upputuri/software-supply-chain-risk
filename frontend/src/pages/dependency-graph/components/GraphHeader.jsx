import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Network,
  RefreshCw,
  Layers,
  ShieldCheck,
  Share2,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import {
  EcosystemBadge,
  StatusBadge,
} from "../../../components/common/Badge";

import { Button } from "../../../components/common/Button";

export function GraphHeader({
  project,
  graphSummary,
  onOpenRebuildModal,
  onBuildGraph,
  building = false,
  onAnalyzeVulnerabilities,
  analyzing = false,
  isCollapsed = false,
  onToggleCollapse,
}) {
  if (!project) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
      {/* Header: always visible */}
      <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {!isCollapsed && (
              <>
                <Link
                  to={`/projects/${project.id}`}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Project Details</span>
                </Link>

                <span className="text-slate-300">•</span>
              </>
            )}

          {!isCollapsed && (
            <>
              <EcosystemBadge ecosystem={project.ecosystem} />

              {graphSummary ? (
                <StatusBadge status={graphSummary.status} />
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  Not Built
                </span>
              )}
            </>
          )}
          </div>

          <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
            <span className="break-words">{project.project_name}</span>

            <span className="text-xs font-mono font-normal text-slate-400 shrink-0">
              (ID #{project.id})
            </span>
          </h2>

          {/* Metrics: visible only when expanded */}
          {!isCollapsed && graphSummary && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-blue-600" />
                Total Nodes:
                <strong className="text-slate-900">
                  {graphSummary.total_node_count}
                </strong>
              </span>

              <span className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-600" />
                Edges:
                <strong className="text-slate-900">
                  {graphSummary.edge_count}
                </strong>
              </span>

              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Direct:
                <strong className="text-slate-900">
                  {graphSummary.direct_package_count}
                </strong>
              </span>

              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Transitive:
                <strong className="text-slate-900">
                  {graphSummary.transitive_node_count}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Action buttons remain visible in both states */}
        <div className="flex items-center gap-2 shrink-0">
          {graphSummary && onAnalyzeVulnerabilities && (
            <Button
              variant="primary"
              size="sm"
              // icon={ShieldAlert}
              loading={analyzing}
              onClick={onAnalyzeVulnerabilities}
            >
              <span className="hidden sm:inline">
                Analyze Vulnerabilities
              </span>
              <span className="sm:hidden">Analyze</span>
            </Button>
          )}

          {graphSummary ? (
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={building}
              onClick={onOpenRebuildModal}
            >
              <span className="hidden sm:inline">Force Rebuild</span>
              <span className="sm:hidden">Rebuild</span>
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

          {/* Collapse / expand toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand project header" : "Collapse project header"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Expand header" : "Collapse header"}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GraphHeader;
