import React from "react";
import { Link } from "react-router-dom";
import {
  Star,
  GitFork,
  AlertCircle,
  ExternalLink,
  Network,
  FileCode,
  ShieldAlert,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { Card } from "../../../components/common/Card";
import { EcosystemBadge, StatusBadge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";

export function ProjectMetadataCard({ project }) {
  if (!project) return null;

  const graph = project.graphs;

  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <EcosystemBadge ecosystem={project.ecosystem} />
            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {project.project_type || "REPOSITORY"}
            </span>
            <span className="text-xs text-slate-400">
              Match: <span className="font-mono">{project.project_match_status || "UNVERIFIED"}</span>
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {project.project_name}
          </h2>
          {project.description && (
            <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        {/* CTA to Graph */}
        <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-2.5 shrink-0">
          <Link to={`/projects/${project.id}/graph`}>
            <Button variant="primary" icon={Network} className="w-full">
              {graph ? "Explore Dependency Graph" : "Build Dependency Graph"}
            </Button>
          </Link>
          {project.homepage && (
            <a
              href={project.homepage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Stats and Metadata Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Stars</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
            {project.stars_count !== null ? project.stars_count : "—"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <GitFork className="w-3.5 h-3.5 text-slate-500" />
            <span>Forks</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
            {project.forks_count !== null ? project.forks_count : "—"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Issues</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
            {project.open_issues_count !== null ? project.open_issues_count : "—"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <FileCode className="w-3.5 h-3.5 text-blue-500" />
            <span>Declared Packages</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
            {project.package_count || project.packages?.length || 1}
          </div>
        </div>
      </div>

      {/* Vulnerability Status Card */}
      <div className="mt-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/70 border-slate-200">
        <div className="flex items-center gap-3">
          {project.vulnerability_status === "vulnerable" ? (
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
          ) : project.vulnerability_status === "safe" ? (
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <span>Security & Vulnerability Status</span>
              {project.vulnerability_status === "vulnerable" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  Vulnerable · {project.findings_count} {project.findings_count === 1 ? "finding" : "findings"}
                </span>
              ) : project.vulnerability_status === "safe" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  No known vulnerabilities
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Not analyzed
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {project.vulnerability_status === "vulnerable"
                ? `${project.vulnerable_packages_count || 1} package ${project.vulnerable_packages_count === 1 ? "version is" : "versions are"} known to be affected by security advisories in PostgreSQL cache.`
                : project.vulnerability_status === "safe"
                ? "All package versions in dependency graph have been scanned with zero matching advisories."
                : "Vulnerability analysis has not been executed yet for this project."}
            </p>
          </div>
        </div>

        <Link
          to={`/projects/${project.id}/graph`}
          className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <span>View in Dependency Graph →</span>
        </Link>
      </div>

      {/* Graph Status Summary if built */}
      {graph && (
        <div className="mt-6 p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <StatusBadge status={graph.status} />
            <span className="text-slate-700 font-medium">
              Graph Built: <span className="font-bold text-slate-900">{graph.total_node_count} nodes</span>,{" "}
              <span className="font-bold text-slate-900">{graph.edge_count} edges</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Direct: <strong className="text-slate-800">{graph.direct_package_count}</strong></span>
            <span>Transitive: <strong className="text-slate-800">{graph.transitive_node_count}</strong></span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default ProjectMetadataCard;
