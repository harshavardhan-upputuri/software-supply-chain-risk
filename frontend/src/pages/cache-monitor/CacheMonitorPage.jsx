import React, { useState, useEffect } from "react";
import { RefreshCw, Server } from "lucide-react";
import graphService from "../../services/dependency-graph/graphService";
import CacheMetricsGrid from "./components/CacheMetricsGrid";
import EcosystemBreakdownChart from "./components/EcosystemBreakdownChart";
import CacheStatusDonut from "./components/CacheStatusDonut";
import { Button } from "../../components/common/Button";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";

export function CacheMonitorPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphService.getCacheStats();
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load cache metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Dependency Cache Monitor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of package dependency graphs cached locally from deps.dev v3
          </p>
        </div>
        <div>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchStats}
            loading={loading}
          >
            Refresh Cache Stats
          </Button>
        </div>
      </div>

      {loading && !stats ? (
        <LoadingState message="Fetching cache statistics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchStats} />
      ) : (
        <>
          {/* Top Metrics Grid */}
          <CacheMetricsGrid stats={stats} />

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EcosystemBreakdownChart ecosystems={stats?.ecosystems || {}} />
            <CacheStatusDonut stats={stats} />
          </div>

          {/* Info Card on Caching Semantics */}
          <div className="p-4 rounded-xl bg-slate-900 text-white text-xs space-y-2 border border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              <Server className="w-4 h-4" />
              <span>Shared Cache Guarantees</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Whenever a project graph is constructed, each declared package version is checked against the shared PostgreSQL cache table (<code className="text-blue-300">package_graph_cache</code>). Valid cache entries are reused immediately across projects without re-querying the network, preventing rate limits and ensuring deterministic resolution.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default CacheMonitorPage;
