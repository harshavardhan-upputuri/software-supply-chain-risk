"""URL configuration for dependency_graph app."""

from django.urls import path
from .views import (
    ProjectListAPIView,
    ProjectDetailAPIView,
    ProjectDependencyGraphAPIView,
    CacheStatsAPIView,
    ImportNextProjectAPIView,
    ProjectVulnerabilityAnalysisAPIView,
    VulnerabilityDashboardStatsAPIView,
)

app_name = "dependency_graph"

urlpatterns = [
    path("projects/", ProjectListAPIView.as_view(), name="project-list"),
    path("projects/import-next/", ImportNextProjectAPIView.as_view(), name="project-import-next"),
    path("projects/<int:id>/", ProjectDetailAPIView.as_view(), name="project-detail"),
    path(
        "projects/<int:id>/dependency-graph/",
        ProjectDependencyGraphAPIView.as_view(),
        name="project-dependency-graph",
    ),
    path(
        "projects/<int:id>/vulnerabilities/analyze/",
        ProjectVulnerabilityAnalysisAPIView.as_view(),
        name="project-vulnerabilities-analyze",
    ),
    path(
        "vulnerabilities/dashboard-stats/",
        VulnerabilityDashboardStatsAPIView.as_view(),
        name="vulnerability-dashboard-stats",
    ),
    path(
        "dependency-graph/cache-stats/",
        CacheStatsAPIView.as_view(),
        name="cache-stats",
    ),
]
