import React, { useState, useEffect, useCallback } from "react";
import graphService from "../../services/dependency-graph/graphService";
import ProjectSearchBar from "./components/ProjectSearchBar";
import ProjectTable from "./components/ProjectTable";
import ProjectPagination from "./components/ProjectPagination";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { Boxes, CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [ecosystem, setEcosystem] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [notification, setNotification] = useState(null);

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

  const handleImportNext = async () => {
    if (importing) return;
    setImporting(true);
    setNotification(null);

    try {
      const result = await graphService.importNextProject();
      if (result.is_end_of_dataset) {
        setNotification({
          type: "info",
          message: result.message || "No more eligible unimported projects remaining in the dataset.",
        });
      } else {
        setNotification({
          type: "success",
          message: result.message || `Project imported successfully: ${result.project?.project_name}`,
        });
        // Refresh project list using current fetching mechanism
        await loadProjects();
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to import next project";
      setNotification({
        type: "error",
        message: errMsg,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Feedback Banner for Import Actions */}
      {notification && (
        <div
          className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border text-xs transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors shrink-0"
            title="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <ProjectSearchBar
        searchQuery={search}
        onSearchChange={handleSearchChange}
        selectedEcosystem={ecosystem}
        onEcosystemChange={handleEcosystemChange}
        onRefresh={loadProjects}
        loading={loading}
        onImportNext={handleImportNext}
        importing={importing}
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
