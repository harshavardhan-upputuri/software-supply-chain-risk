import React from "react";
import { Package, ExternalLink } from "lucide-react";
import { Card, CardHeader } from "../../../components/common/Card";

export function PackageListTable({ packages = [], ecosystem = "PYPI" }) {
  return (
    <Card>
      <CardHeader
        title="Declared Manifest Packages"
        subtitle="Original packages and release versions specified in the project source dataset"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-6">Package Name</th>
              <th className="py-3 px-4">Version</th>
              <th className="py-3 px-4">Relation Type</th>
              <th className="py-3 px-4">Provenance</th>
              <th className="py-3 px-6 text-right">External Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {packages.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No packages recorded in this project manifest.
                </td>
              </tr>
            ) : (
              packages.map((pkg) => {
                const encodedName = encodeURIComponent(pkg.package_name);
                const depsDevUrl = `https://deps.dev/${ecosystem.toLowerCase()}/packages/${encodedName}/versions/${encodeURIComponent(pkg.version)}`;

                return (
                  <tr key={pkg.id || pkg.package_name + pkg.version} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold text-slate-900 font-mono">
                          {pkg.package_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-800">
                      v{pkg.version}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {pkg.relation_type || "SOURCE_REPO_TYPE"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {pkg.relation_provenance || "UNVERIFIED_METADATA"}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <a
                        href={depsDevUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <span>deps.dev</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default PackageListTable;
