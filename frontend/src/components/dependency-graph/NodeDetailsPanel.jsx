import React from "react";
import { X, ExternalLink } from "lucide-react";
import { Badge, EcosystemBadge } from "../common/Badge";

export function NodeDetailsPanel({ node, edges = [], onClose }) {
  if (!node) return null;

  const data = node.data || {};
  const { name, version, system, isOriginal, relation, depth } = data;

  // Find incoming and outgoing edges for this node
  const outgoing = edges.filter((e) => e.source === node.id);
  const incoming = edges.filter((e) => e.target === node.id);

  // Link to deps.dev
  const encodedName = encodeURIComponent(name || "");
  const depsDevUrl = `https://deps.dev/${(system || "pypi").toLowerCase()}/packages/${encodedName}`;

  return (
    <div className="w-80 sm:w-96 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
        <div className="overflow-hidden pr-2">
          <div className="flex items-center gap-2 mb-1">
            <EcosystemBadge ecosystem={system} />
            {isOriginal ? (
              <Badge variant="primary">Root Project Package</Badge>
            ) : depth === 1 ? (
              <Badge variant="success">Direct Dependency</Badge>
            ) : (
              <Badge variant="default">Transitive</Badge>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-900 truncate" title={name}>
            {name}
          </h4>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Version: {version || "Unspecified"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 overflow-y-auto text-xs text-slate-600">
        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Depth</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">{depth}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Outgoing</div>
            <div className="text-base font-bold text-blue-600 mt-0.5">{outgoing.length}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Incoming</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{incoming.length}</div>
          </div>
        </div>

        {/* Dependency details */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Relationship:</span>
            <span className="font-semibold text-slate-800">{relation || "None"}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Original Project Manifest:</span>
            <span className="font-semibold text-slate-800">
              {isOriginal ? "Yes (Declared)" : "No (Resolved)"}
            </span>
          </div>
        </div>

        {/* Direct Dependencies of this node */}
        {outgoing.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <h5 className="font-semibold text-slate-800 mb-2">
              Dependencies ({outgoing.length})
            </h5>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {outgoing.map((edge) => (
                <div
                  key={edge.id}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between"
                >
                  <span className="font-mono text-slate-700 truncate" title={edge.target}>
                    {edge.target}
                  </span>
                  {edge.data?.requirement && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {edge.data.requirement}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Required by nodes */}
        {incoming.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <h5 className="font-semibold text-slate-800 mb-2">
              Required by ({incoming.length})
            </h5>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {incoming.map((edge) => (
                <div
                  key={edge.id}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between"
                >
                  <span className="font-mono text-slate-700 truncate" title={edge.source}>
                    {edge.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External Link */}
        <div className="pt-3">
          <a
            href={depsDevUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
          >
            <span>View package on deps.dev</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default NodeDetailsPanel;
