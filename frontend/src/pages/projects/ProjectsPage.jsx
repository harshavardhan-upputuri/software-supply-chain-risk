import React, { useState, useEffect, useCallback } from "react";
import graphService from "../../services/dependency-graph/graphService";
import ProjectSearchBar from "./components/ProjectSearchBar";
import ProjectTable from "./components/ProjectTable";
import ProjectPagination from "./components/ProjectPagination";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { Boxes } from "lucide-react";

export function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [ecosystem, setEcosystem] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphService.getProjects({
        page: currentPage,
        ecosystem,
        search,
      });
      setProjects(data.results || []);
      setTotalCount(data.count || data.results?.length || 0);
    } catch (err) {
      setError(err.message || "Failed to load project inventory");
    } finally {
      setLoading(false);
    }
  }, [currentPage, ecosystem, search]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // When search or filter changes, reset to page 1
  const handleEcosystemChange = (newEco) => {
    setEcosystem(newEco);
    setCurrentPage(1);
  };

  const handleSearchChange = (newQuery) => {
    setSearch(newQuery);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Project Inventory
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Browse software projects, inspect package manifests, and generate dependency graphs
        </p>
      </div>

      {/* Filter and Search Bar */}
      <ProjectSearchBar
        searchQuery={search}
        onSearchChange={handleSearchChange}
        selectedEcosystem={ecosystem}
        onEcosystemChange={handleEcosystemChange}
        onRefresh={loadProjects}
        loading={loading}
      />

      {/* Content State */}
      {loading ? (
        <LoadingState message="Loading projects from PostgreSQL..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadProjects} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No Projects Found"
          description={
            search || ecosystem !== "ALL"
              ? "No projects matched your search criteria. Try modifying your filters."
              : "No projects exist in the database yet. Run the import command to ingest projects."
          }
          icon={Boxes}
        />
      ) : (
        <div className="space-y-4">
          <ProjectTable projects={projects} />
          <ProjectPagination
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
