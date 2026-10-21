import React from "react";
import { X, ExternalLink, ArrowRight, ArrowLeft } from "lucide-react";
import { Badge, EcosystemBadge } from "../common/Badge";

export function NodeDetailsPanel({ node, edges = [], onClose, onSelectNode }) {
  if (!node) return null;

  const data = node.data || {};
  const {
    name = "",
    version = "",
    system = "",
    isOriginal,
    isRoot: isExplicitRoot,
    kind,
    relation = "",
    depth = 0,
  } = data;

  const isProjectRoot = kind === "project-root" || isOriginal === true || isExplicitRoot === true;
  const isDirect = !isProjectRoot && (kind === "direct" || depth === 1 || relation === "DIRECT");

  const outgoing = edges.filter((e) => String(e.source) === String(node.id));
  const incoming = edges.filter((e) => String(e.target) === String(node.id));

  const encodedName = encodeURIComponent(name);
  const depsDevUrl = `https://deps.dev/${(system || "pypi").toLowerCase()}/packages/${encodedName}`;

  return (
    <div className="flex max-h-[82vh] w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl backdrop-blur-xs sm:w-88">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 p-3.5">
        <div className="min-w-0 flex-1 pr-2">
          <div className="mb-1 flex items-center gap-1.5">
            <EcosystemBadge ecosystem={system || (isProjectRoot ? "project" : "pkg")} />
            {isProjectRoot ? (
              <Badge variant="primary">Project Root</Badge>
            ) : isDirect ? (
              <Badge variant="success">Direct Dependency</Badge>
            ) : (
              <Badge variant="default">Transitive</Badge>
            )}
          </div>
          <h4 className="truncate text-xs font-bold text-slate-900" title={name}>
            {name}
          </h4>
          <p className="mt-0.5 font-mono text-[11px] text-slate-500">
            {isProjectRoot
              ? "Project workspace manifest"
              : version
              ? `v${version}`
              : "Unpinned version"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-3.5 overflow-y-auto p-3.5 text-xs text-slate-600">
        {/* Metric Overview */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-center">
            <div className="text-[10px] uppercase text-slate-400 font-medium">Depth</div>
            <div className="mt-0.5 text-sm font-bold text-slate-800">{depth}</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-center">
            <div className="text-[10px] uppercase text-slate-400 font-medium">Depends On</div>
            <div className="mt-0.5 text-sm font-bold text-blue-600">{outgoing.length}</div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-center">
            <div className="text-[10px] uppercase text-slate-400 font-medium">Required By</div>
            <div className="mt-0.5 text-sm font-bold text-emerald-600">{incoming.length}</div>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[11px]">
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Classification:</span>
            <span className="font-medium text-slate-800">
              {isProjectRoot ? "Main Project Root" : isDirect ? "Direct Dependency" : "Transitive Dependency"}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Position:</span>
            <span className="font-medium text-slate-800">
              {isProjectRoot ? "Root Manifest" : `Hop distance ${depth} from project`}
            </span>
          </div>
        </div>

        {/* Outgoing Dependencies */}
        {outgoing.length > 0 && (
          <div className="border-t border-slate-100 pt-2">
            <div className="mb-1.5 flex items-center justify-between">
              <h5 className="font-semibold text-slate-800 text-[11px]">
                {isProjectRoot ? "Project Direct Dependencies" : "Direct Dependencies"} ({outgoing.length})
              </h5>
              <span className="text-[10px] text-slate-400">Click to focus</span>
            </div>
            <div className="max-h-32 space-y-1 overflow-y-auto pr-0.5">
              {outgoing.map((edge) => (
                <button
                  key={edge.id}
                  onClick={() => onSelectNode?.(edge.target)}
                  className="group flex w-full items-center justify-between rounded-md border border-slate-200/60 bg-slate-50/70 p-1.5 text-left text-[11px] transition-colors hover:border-blue-300 hover:bg-blue-50/60"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 shrink-0 text-blue-500 transition-transform group-hover:translate-x-0.5" />
                    <span className="truncate font-mono text-slate-700 group-hover:text-blue-900" title={edge.target}>
                      {edge.target}
                    </span>
                  </div>
                  {edge.data?.requirement && (
                    <span className="ml-1 shrink-0 font-mono text-[10px] text-slate-400">
                      {edge.data.requirement}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Dependencies */}
        {incoming.length > 0 && (
          <div className="border-t border-slate-100 pt-2">
            <div className="mb-1.5 flex items-center justify-between">
              <h5 className="font-semibold text-slate-800 text-[11px]">
                Required By ({incoming.length})
              </h5>
              <span className="text-[10px] text-slate-400">Click to focus</span>
            </div>
            <div className="max-h-32 space-y-1 overflow-y-auto pr-0.5">
              {incoming.map((edge) => (
                <button
                  key={edge.id}
                  onClick={() => onSelectNode?.(edge.source)}
                  className="group flex w-full items-center justify-between rounded-md border border-slate-200/60 bg-slate-50/70 p-1.5 text-left text-[11px] transition-colors hover:border-emerald-300 hover:bg-emerald-50/60"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <ArrowLeft className="h-3 w-3 shrink-0 text-emerald-600 transition-transform group-hover:-translate-x-0.5" />
                    <span className="truncate font-mono text-slate-700 group-hover:text-emerald-900" title={edge.source}>
                      {edge.source}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* External Link (hidden for root project node) */}
        {!isProjectRoot && (
          <div className="border-t border-slate-100 pt-2">
            <a
              href={depsDevUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              <span>View package on deps.dev</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default NodeDetailsPanel;