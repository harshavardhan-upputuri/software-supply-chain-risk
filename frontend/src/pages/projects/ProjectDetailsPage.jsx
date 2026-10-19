import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import graphService from "../../services/dependency-graph/graphService";
import ProjectMetadataCard from "./components/ProjectMetadataCard";
import PackageListTable from "./components/PackageListTable";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";

export function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjectDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphService.getProject(id);
      setProject(data);
    } catch (err) {
      setError(err.message || "Failed to load project details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  if (loading) {
    return <LoadingState message="Loading project details from database..." />;
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
        <ErrorState
          title="Project Not Found"
          message={error || `Could not find any project with ID #${id}`}
          onRetry={fetchProjectDetails}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      {/* Project Metadata Overview Card */}
      <ProjectMetadataCard project={project} />

      {/* Declared Packages List */}
      <PackageListTable
        packages={project.packages || []}
        ecosystem={project.ecosystem}
      />
    </div>
  );
}

export default ProjectDetailsPage;
