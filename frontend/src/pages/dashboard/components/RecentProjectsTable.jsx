import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Network } from "lucide-react";
import { Card, CardHeader } from "../../../components/common/Card";
import { EcosystemBadge } from "../../../components/common/Badge";

export function RecentProjectsTable({ projects = [] }) {
  return (
    <Card>
      <CardHeader
        title="Active Projects"
        subtitle="Recent software repositories registered in the supply chain database"
        action={
          <Link
            to="/projects"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-6">Project</th>
              <th className="py-3 px-4">Ecosystem</th>
              <th className="py-3 px-4">Packages</th>
              <th className="py-3 px-4">Graph Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No projects imported yet.
                </td>
              </tr>
            ) : (
              projects.map((proj) => (
                <tr key={proj.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-6">
                    <div className="font-semibold text-slate-900">{proj.project_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {proj.project_type || "REPOSITORY"}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <EcosystemBadge ecosystem={proj.ecosystem} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono">{proj.package_count || 1}</span> declared
                  </td>
                  <td className="py-3.5 px-4">
                    {proj.has_graph ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Built
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Not Built
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/projects/${proj.id}`}
                        className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        Details
                      </Link>
                      <Link
                        to={`/projects/${proj.id}/graph`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <Network className="w-3.5 h-3.5" />
                        <span>Graph</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default RecentProjectsTable;
