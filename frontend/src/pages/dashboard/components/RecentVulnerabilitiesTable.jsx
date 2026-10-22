import React from "react";
import { Link } from "react-router-dom";

export function RecentVulnerabilitiesTable({ findings = [] }) {
  const getSeverityBadge = (severity) => {
    const s = (severity || "").toUpperCase();

    if (s.includes("CRITICAL")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
          Critical
        </span>
      );
    }
    if (s.includes("HIGH")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          High
        </span>
      );
    }
    if (s.includes("MODERATE") || s.includes("MEDIUM")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          Medium
        </span>
      );
    }
    if (s.includes("LOW")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Low
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
        {severity || "Unknown"}
      </span>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
        <div>
          <h3 className="text-xs font-semibold text-slate-900 tracking-tight">
            Recent Vulnerabilities
          </h3>
          <p className="text-[11px] text-slate-500">
            Security advisories matched against project dependencies
          </p>
        </div>

        <Link
          to="/projects"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          All projects →
        </Link>
      </div>

      {findings.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          No vulnerabilities reported. Scanned projects are currently clear of known advisories.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/70 font-medium text-slate-500">
              <tr>
                <th className="px-5 py-2.5">Vulnerability</th>
                <th className="px-4 py-2.5">Severity</th>
                <th className="px-4 py-2.5">Package</th>
                <th className="px-4 py-2.5">Project</th>
                <th className="px-4 py-2.5">Fixed Version</th>
                <th className="px-5 py-2.5 text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {findings.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                  {/* Vulnerability ID */}
                  <td className="px-5 py-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                    {item.vulnerability_id}
                  </td>

                  {/* Severity Badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getSeverityBadge(item.severity)}
                  </td>

                  {/* Package & Ecosystem */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 truncate max-w-[190px]" title={item.package_name}>
                      {item.package_name}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      {item.ecosystem} · v{item.package_version}
                    </div>
                  </td>

                  {/* Project Anchor */}
                  <td className="px-4 py-3">
                    {item.project ? (
                      <Link
                        to={`/projects/${item.project.id}/graph`}
                        className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        {item.project.project_name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Remediation */}
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {item.fixed_version ? (
                      <span className="text-emerald-700 font-medium">≥ {item.fixed_version}</span>
                    ) : (
                      <span className="text-slate-400">No fix available</span>
                    )}
                  </td>

                  {/* Action Link */}
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {item.advisory_url ? (
                      <a
                        href={item.advisory_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Advisory
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RecentVulnerabilitiesTable;