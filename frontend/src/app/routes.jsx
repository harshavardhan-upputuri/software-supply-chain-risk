import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ProjectsPage from "../pages/projects/ProjectsPage";
import ProjectDetailsPage from "../pages/projects/ProjectDetailsPage";
import DependencyGraphPage from "../pages/dependency-graph/DependencyGraphPage";
import CacheMonitorPage from "../pages/cache-monitor/CacheMonitorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "projects",
        element: <ProjectsPage />,
      },
      {
        path: "projects/:id",
        element: <ProjectDetailsPage />,
      },
      {
        path: "projects/:id/graph",
        element: <DependencyGraphPage />,
      },
      {
        path: "cache",
        element: <CacheMonitorPage />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;
