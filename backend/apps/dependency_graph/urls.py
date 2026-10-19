"""URL configuration for dependency_graph app."""

from django.urls import path
from .views import (
    ProjectListAPIView,
    ProjectDetailAPIView,
    ProjectDependencyGraphAPIView,
    CacheStatsAPIView,
)

app_name = "dependency_graph"

urlpatterns = [
    path("projects/", ProjectListAPIView.as_view(), name="project-list"),
    path("projects/<int:id>/", ProjectDetailAPIView.as_view(), name="project-detail"),
    path(
        "projects/<int:id>/dependency-graph/",
        ProjectDependencyGraphAPIView.as_view(),
        name="project-dependency-graph",
    ),
    path(
        "dependency-graph/cache-stats/",
        CacheStatsAPIView.as_view(),
        name="cache-stats",
    ),
]
