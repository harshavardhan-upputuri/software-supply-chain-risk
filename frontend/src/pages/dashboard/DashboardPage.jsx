import React, { useState, useEffect } from "react";
import graphService from "../../services/dependency-graph/graphService";
import StatCard from "./components/StatCard";
import EcosystemChart from "./components/EcosystemChart";
import CacheStatusChart from "./components/CacheStatusChart";
import RecentProjectsTable from "./components/RecentProjectsTable";
import RecentVulnerabilitiesTable from "./components/RecentVulnerabilitiesTable";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [cacheStats, setCacheStats] = useState(null);
  const [vulnerabilityStats, setVulnerabilityStats] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projRes, statsRes, vulnRes] = await Promise.all([
        graphService.getProjects({ page: 1 }),
        graphService.getCacheStats(),
        graphService.getVulnerabilityDashboardStats(),
      ]);

      setProjectsData(projRes.results || []);
      setTotalProjects(projRes.count || projRes.results?.length || 0);
      setCacheStats(statsRes);
      setVulnerabilityStats(vulnRes);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading dashboard metrics..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  const mavenCount =
    cacheStats?.ecosystems?.MAVEN?.total ??
    projectsData.filter((p) => p.ecosystem === "MAVEN").length;
  const pypiCount =
    cacheStats?.ecosystems?.PYPI?.total ??
    projectsData.filter((p) => p.ecosystem === "PYPI").length;

  const ecosystemChartData = [
    { name: "Maven", count: mavenCount },
    { name: "PyPI", count: pypiCount },
  ];

  const cacheStatusChartData = [
    { name: "Complete", value: cacheStats?.complete_count || 0 },
    { name: "Empty", value: cacheStats?.empty_count || 0 },
    { name: "Failed", value: cacheStats?.failed_count || 0 },
  ];

  const vulnSummary = vulnerabilityStats?.summary || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
          System Overview
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Inventory status, dependency graph topology, and security vulnerability findings
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Projects"
          value={totalProjects}
          meta="Active workspaces"
          status="Maven & PyPI"
        />
        <StatCard
          label="Cached Packages"
          value={cacheStats?.total_cached_packages || 0}
          meta="Resolved dependencies"
          status="deps.dev v3"
        />
        <StatCard
          label="Graph Nodes"
          value={cacheStats?.total_normalized_nodes || 0}
          meta="Normalized packages"
          status="DAG resolution"
        />
        <StatCard
          label="Graph Edges"
          value={cacheStats?.total_normalized_edges || 0}
          meta="Direct & transitive relations"
          status="Directed links"
        />
      </div>

      {/* Security Health Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Security & Vulnerability State
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Risk assessment derived from scanned project dependencies
            </p>
          </div>
          {vulnSummary.vulnerable_packages_count > 0 && (
            <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              {vulnSummary.vulnerable_packages_count} packages need remediation
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Scanned Projects
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-1">
              {vulnSummary.analyzed_projects_count ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {vulnSummary.checked_packages_count ?? 0} package versions checked
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Vulnerable Packages
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-1">
              {vulnSummary.vulnerable_packages_count ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Affecting dependency trees
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Advisories Found
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-1">
              {vulnSummary.advisory_findings_count ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Total CVE / GHSA occurrences
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Critical Severity
            </div>
            <div className="text-xl font-semibold text-red-600 mt-1">
              {vulnSummary.critical_findings_count ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              High risk vulnerabilities
            </div>
          </div>
        </div>
      </div>

      {/* Vulnerability Table */}
      <RecentVulnerabilitiesTable findings={vulnerabilityStats?.recent_findings || []} />

      {/* Analytics Charts */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EcosystemChart data={ecosystemChartData} />
        <CacheStatusChart data={cacheStatusChartData} />
      </div> */}

      {/* Projects Table */}
      <RecentProjectsTable projects={projectsData.slice(0, 5)} />
    </div>
  );
}

export default DashboardPage;