import React from "react";
import { X, ExternalLink, ArrowRight, ArrowLeft, ShieldAlert } from "lucide-react";
import { Badge, EcosystemBadge } from "../common/Badge";

export function NodeDetailsPanel({
  node,
  edges = [],
  vulnerabilities = [],
  onClose,
  onSelectNode,
}) {
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

        {/* Vulnerabilities Section (if any detected for this package) */}
        {vulnerabilities.length > 0 && (
          <div className="border-t border-rose-100 bg-rose-50/50 -mx-3.5 px-3.5 py-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                Vulnerabilities ({vulnerabilities.length})
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                Known CVEs
              </span>
            </div>

            <div className="max-h-48 space-y-2 overflow-y-auto pr-0.5">
              {vulnerabilities.map((vuln, idx) => {
                const sev = (vuln.severity || "UNKNOWN").toUpperCase();
                const badgeColor =
                  sev.includes("CRITICAL")
                    ? "bg-rose-100 text-rose-800 border-rose-200"
                    : sev.includes("HIGH")
                    ? "bg-red-100 text-red-800 border-red-200"
                    : sev.includes("MEDIUM") || sev.includes("MODERATE")
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200";

                return (
                  <div
                    key={`${vuln.vulnerability_id}-${idx}`}
                    className="rounded-lg border border-rose-200/80 bg-white p-2 text-[11px] shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-rose-700">
                        {vuln.vulnerability_id}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {sev}
                      </span>
                    </div>

                    <p className="text-slate-600 line-clamp-2 text-[11px] leading-tight">
                      {vuln.summary || "No description provided."}
                    </p>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100">
                      <span>
                        Fixed in:{" "}
                        <strong className="font-mono text-emerald-700">
                          {vuln.fixed_version || "None"}
                        </strong>
                      </span>
                      {vuln.advisory_url && (
                        <a
                          href={vuln.advisory_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <span>Advisory</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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