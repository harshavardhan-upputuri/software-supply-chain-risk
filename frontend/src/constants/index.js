/** Application Constants */

export const ECOSYSTEMS = {
  ALL: "ALL",
  MAVEN: "MAVEN",
  PYPI: "PYPI",
};

export const GRAPH_STATUS = {
  COMPLETE: "COMPLETE",
  PARTIAL: "PARTIAL",
  FAILED: "FAILED",
  PENDING: "PENDING",
};

export const STATUS_COLORS = {
  COMPLETE: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  PARTIAL: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  FAILED: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  PENDING: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

export const NODE_TYPES = {
  ORIGINAL: "ROOT",
  DIRECT: "DIRECT",
  INDIRECT: "INDIRECT",
};

export const APP_ROUTES = {
  DASHBOARD: "/",
  PROJECTS: "/projects",
  PROJECT_DETAILS: (id) => `/projects/${id}`,
  DEPENDENCY_GRAPH: (id) => `/projects/${id}/graph`,
  CACHE_MONITOR: "/cache",
};
