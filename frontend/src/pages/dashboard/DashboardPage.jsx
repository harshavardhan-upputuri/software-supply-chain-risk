import React, { useState, useEffect } from "react";
import {
  Boxes,
  Database,
  Network,
  Share2,
} from "lucide-react";
import graphService from "../../services/dependency-graph/graphService";
import StatCard from "./components/StatCard";
import EcosystemChart from "./components/EcosystemChart";
import CacheStatusChart from "./components/CacheStatusChart";
import RecentProjectsTable from "./components/RecentProjectsTable";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [cacheStats, setCacheStats] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projRes, statsRes] = await Promise.all([
        graphService.getProjects({ page: 1 }),
        graphService.getCacheStats(),
      ]);

      setProjectsData(projRes.results || []);
      setTotalProjects(projRes.count || projRes.results?.length || 0);
      setCacheStats(statsRes);
    } catch (err) {
      setError(err.message || "Failed to load dashboard overview data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading platform metrics & statistics..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  // Calculate ecosystem breakdown from cache stats or projects
  const mavenCount = cacheStats?.ecosystems?.MAVEN?.total ?? projectsData.filter((p) => p.ecosystem === "MAVEN").length;
  const pypiCount = cacheStats?.ecosystems?.PYPI?.total ?? projectsData.filter((p) => p.ecosystem === "PYPI").length;

  const ecosystemChartData = [
    { name: "Maven", count: mavenCount },
    { name: "PyPI", count: pypiCount },
  ];

  const cacheStatusChartData = [
    { name: "Complete", value: cacheStats?.complete_count || 0 },
    { name: "Empty", value: cacheStats?.empty_count || 0 },
    { name: "Failed", value: cacheStats?.failed_count || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Supply Chain Overview
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Global software project inventory, dependency graph resolutions, and caching metrics
        </p>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Imported Projects"
          value={totalProjects}
          subtitle="Registered repositories"
          icon={Boxes}
          color="blue"
          trend={{ label: "Ecosystems", value: "Maven & PyPI" }}
        />
        <StatCard
          title="Cached Packages"
          value={cacheStats?.total_cached_packages || 0}
          subtitle="Resolved via deps.dev v3"
          icon={Database}
          color="emerald"
          trend={{ label: "Success rate", value: "100% complete" }}
        />
        <StatCard
          title="Graph Nodes"
          value={cacheStats?.total_normalized_nodes || 0}
          subtitle="Normalized dependencies"
          icon={Network}
          color="purple"
          trend={{ label: "Resolution", value: "Hierarchical DAG" }}
        />
        <StatCard
          title="Graph Edges"
          value={cacheStats?.total_normalized_edges || 0}
          subtitle="Dependency relations"
          icon={Share2}
          color="amber"
          trend={{ label: "Relationships", value: "Directed" }}
        />
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EcosystemChart data={ecosystemChartData} />
        <CacheStatusChart data={cacheStatusChartData} />
      </div>

      {/* Active Projects Table */}
      <RecentProjectsTable projects={projectsData.slice(0, 5)} />
    </div>
  );
}

export default DashboardPage;
