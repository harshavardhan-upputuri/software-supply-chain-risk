import React from "react";
import { Link } from "react-router-dom";
import { Network, CheckCircle2, Clock } from "lucide-react";
import { EcosystemBadge } from "../../../components/common/Badge";

export function ProjectTable({ projects = [] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-6">Project / Repository</th>
              <th className="py-3.5 px-4">Ecosystem</th>
              <th className="py-3.5 px-4">Platform Type</th>
              <th className="py-3.5 px-4">Packages</th>
              <th className="py-3.5 px-4">Dependency Graph</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {projects.map((proj) => (
              <tr key={proj.id} className="hover:bg-slate-50/60 transition-colors">
                {/* Project Identity */}
                <td className="py-4 px-6">
                  <Link
                    to={`/projects/${proj.id}`}
                    className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {proj.project_name}
                  </Link>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Match Status: <span className="font-mono">{proj.project_match_status || "UNKNOWN"}</span>
                  </div>
                </td>

                {/* Ecosystem */}
                <td className="py-4 px-4">
                  <EcosystemBadge ecosystem={proj.ecosystem} />
                </td>

                {/* Platform */}
                <td className="py-4 px-4">
                  <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {proj.project_type || "REPOSITORY"}
                  </span>
                </td>

                {/* Packages */}
                <td className="py-4 px-4">
                  <div className="font-mono text-slate-800 font-semibold">
                    {proj.package_count || 1}
                  </div>
                  <div className="text-[10px] text-slate-400">declared</div>
                </td>

                {/* Graph Status */}
                <td className="py-4 px-4">
                  {proj.has_graph ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Built
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Pending
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/projects/${proj.id}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Details
                    </Link>
                    <Link
                      to={`/projects/${proj.id}/graph`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Graph</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectTable;
