import React from "react";
import { Link } from "react-router-dom";
import {
  Star,
  GitFork,
  AlertCircle,
  ExternalLink,
  Network,
  FileCode,
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
