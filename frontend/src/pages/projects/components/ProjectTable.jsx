import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Network, CheckCircle2, Clock } from "lucide-react";
import { EcosystemBadge } from "../../../components/common/Badge";
import { ProjectPagination } from "./ProjectPagination";

const PAGE_SIZE = 10;

export function ProjectTable({ projects = [] }) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to the first page when the source list or filter updates
  useEffect(() => {
    setCurrentPage(1);
  }, [projects.length]);

  // Compute total pages and ensure current page is within valid range
  const totalPages = Math.ceil(projects.length / PAGE_SIZE) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  // Slice exactly 10 items for the active view
  const paginatedProjects = useMemo(() => {
    const startIndex = (safePage - 1) * PAGE_SIZE;
    return projects.slice(startIndex, startIndex + PAGE_SIZE);
  }, [projects, safePage]);

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-xs">
        No projects found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/80 font-semibold tracking-wider text-slate-500 uppercase">
            <tr>
              <th className="px-6 py-3.5">Project / Repository</th>
              <th className="px-4 py-3.5">Ecosystem</th>
              <th className="px-4 py-3.5">Platform Type</th>
              <th className="px-4 py-3.5">Packages</th>
              <th className="px-4 py-3.5">Dependency Graph</th>
              <th className="px-4 py-3.5">Vulnerabilities</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {paginatedProjects.map((proj) => (
              <tr key={proj.id} className="transition-colors hover:bg-slate-50/60">
                {/* Project Identity */}
                <td className="px-6 py-4">
                  <Link
                    to={`/projects/${proj.id}`}
                    className="font-semibold text-slate-900 transition-colors hover:text-blue-600"
                  >
                    {proj.project_name}
                  </Link>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Match Status:{" "}
                    <span className="font-mono">{proj.project_match_status || "UNKNOWN"}</span>
                  </div>
                </td>

                {/* Ecosystem */}
                <td className="px-4 py-4">
                  <EcosystemBadge ecosystem={proj.ecosystem} />
                </td>

                {/* Platform */}
                <td className="px-4 py-4">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                    {proj.project_type || "REPOSITORY"}
                  </span>
                </td>

                {/* Packages */}
                <td className="px-4 py-4">
                  <div className="font-mono font-semibold text-slate-800">
                    {proj.package_count || 1}
                  </div>
                  <div className="text-[10px] text-slate-400">declared</div>
                </td>

                {/* Graph Status */}
                <td className="px-4 py-4">
                  {proj.has_graph ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {/* <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> */}
                      Built
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Pending
                    </span>
                  )}
                </td>
                {/* Vulnerability Status */}
                <td className="px-4 py-4">
                  {proj.vulnerability_status === "vulnerable" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      {/* <span className="h-2 w-2 rounded-full bg-rose-500" /> */}
                      <span>
                        Vulnerable · {proj.findings_count || 1} {proj.findings_count === 1 ? "finding" : "findings"}
                      </span>
                    </span>
                  ) : proj.vulnerability_status === "safe" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {/* <span className="h-2 w-2 rounded-full bg-emerald-500" /> */}
                      <span>No known vulnerabilities</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                      <span>Not analyzed</span>
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* <Link
                      to={`/projects/${proj.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Details
                    </Link> */}
                    <Link
                      to={`/projects/${proj.id}/graph`}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
                    >
                      <Network className="h-3.5 w-3.5" />
                      <span>Graph</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination attached at the footer */}
      <ProjectPagination
        currentPage={safePage}
        totalCount={projects.length}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}

export default ProjectTable;