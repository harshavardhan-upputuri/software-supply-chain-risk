import React from "react";
import { Database, CheckCircle2, AlertCircle, XCircle, Network, Share2 } from "lucide-react";
import { Card } from "../../../components/common/Card";

export function CacheMetricsGrid({ stats }) {
  if (!stats) return null;

  const metrics = [
    {
      title: "Total Cached Packages",
      value: stats.total_cached_packages || 0,
      subtitle: "Unique (Ecosystem, Name, Version) tuples",
      icon: Database,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Complete Graphs",
      value: stats.complete_count || 0,
      subtitle: "Fully resolved upstream graphs",
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: "Empty Graphs",
      value: stats.empty_count || 0,
      subtitle: "Valid package with 0 dependencies",
      icon: AlertCircle,
      color: "text-slate-600 bg-slate-100 border-slate-200",
    },
    {
      title: "Failed Ingestions",
      value: stats.failed_count || 0,
      subtitle: "404 Not Found or API timeouts",
      icon: XCircle,
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
    {
      title: "Normalized Nodes",
      value: stats.total_normalized_nodes || 0,
      subtitle: "Stored in package_graph_nodes table",
      icon: Network,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      title: "Normalized Edges",
      value: stats.total_normalized_edges || 0,
      subtitle: "Stored in package_graph_edges table",
      icon: Share2,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card key={m.title} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {m.title}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                  {m.value}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">{m.subtitle}</p>
              </div>
              <div className={`p-2.5 rounded-xl border ${m.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default CacheMetricsGrid;
