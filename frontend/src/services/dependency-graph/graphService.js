/** Service for project and dependency graph API calls */
import apiClient from "../api";

export const graphService = {
  /**
   * Fetch paginated projects with optional ecosystem and search filters
   */
  async getProjects({ page = 1, ecosystem = null, search = "" } = {}) {
    const params = { page };
    if (ecosystem && ecosystem !== "ALL") {
      params.ecosystem = ecosystem;
    }
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await apiClient.get("/projects/", { params });
    return response.data;
  },

  /**
   * Fetch a single project with its metadata and original packages
   */
  async getProject(id) {
    const response = await apiClient.get(`/projects/${id}/`);
    return response.data;
  },

  /**
   * Trigger construction of dependency graph for a project
   */
  async buildDependencyGraph(id, forceRebuild = false) {
    const response = await apiClient.post(`/projects/${id}/dependency-graph/`, {
      force_rebuild: forceRebuild,
    });
    return response.data;
  },

  /**
   * Retrieve graph status, summary and paginated nodes/edges
   */
  async getDependencyGraph(id, { nodesPage = 1, nodesPageSize = 100, edgesPage = 1, edgesPageSize = 100 } = {}) {
    const params = {
      nodes_page: nodesPage,
      nodes_page_size: nodesPageSize,
      edges_page: edgesPage,
      edges_page_size: edgesPageSize,
    };
    const response = await apiClient.get(`/projects/${id}/dependency-graph/`, { params });
    return response.data;
  },

  /**
   * Retrieve global package graph cache statistics
   */
  async getCacheStats() {
    const response = await apiClient.get("/dependency-graph/cache-stats/");
    return response.data;
  },
};

export default graphService;
