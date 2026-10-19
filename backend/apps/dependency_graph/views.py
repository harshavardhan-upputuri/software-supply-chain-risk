"""REST API views for dependency graph backend."""

import logging
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Project, ProjectGraph, ProjectGraphNode, ProjectGraphEdge
from .serializers import (
    ProjectListSerializer,
    ProjectDetailSerializer,
    ProjectGraphSummarySerializer,
    ProjectGraphNodeSerializer,
    ProjectGraphEdgeSerializer,
)
from .services.graph_builder import GraphBuilder
from .services.cache_manager import CacheManager

logger = logging.getLogger(__name__)


class ProjectListAPIView(generics.ListAPIView):
    """GET /api/projects/ - Paginated project listing with search and ecosystem filtering."""

    serializer_class = ProjectListSerializer

    def get_queryset(self):
        queryset = Project.objects.all().order_by("id")
        ecosystem = self.request.query_params.get("ecosystem")
        if ecosystem:
            queryset = queryset.filter(ecosystem__iexact=ecosystem.strip())

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(project_name__icontains=search.strip())

        return queryset


class ProjectDetailAPIView(generics.RetrieveAPIView):
    """GET /api/projects/{id}/ - Project metadata and original packages list."""

    queryset = Project.objects.prefetch_related("packages").all()
    serializer_class = ProjectDetailSerializer
    lookup_field = "id"


class ProjectDependencyGraphAPIView(APIView):
    """Endpoints for constructing and retrieving project dependency graphs.

    POST /api/projects/{id}/dependency-graph/ - Build or retrieve cached graph
    GET  /api/projects/{id}/dependency-graph/ - Retrieve graph summary and paginated nodes/edges
    """

    def post(self, request, id: int):
        project = get_object_or_404(Project, id=id)

        # Check for force_rebuild option
        force_rebuild = False
        if request.data and isinstance(request.data, dict):
            force_rebuild = bool(request.data.get("force_rebuild", False))
        if not force_rebuild:
            force_rebuild = request.query_params.get("force_rebuild", "false").lower() in ("true", "1")

        builder = GraphBuilder()
        try:
            graph, was_cached, stats = builder.build_project_graph(
                project=project,
                force_rebuild=force_rebuild,
            )
        except Exception as e:
            logger.exception("Failed to build dependency graph for project %s", id)
            return Response(
                {"error": f"Failed to build graph: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        summary_data = ProjectGraphSummarySerializer(graph).data
        response_payload = {
            "graph": summary_data,
            "was_cached": was_cached,
            "stats": stats,
        }

        # Return appropriate status code
        if graph.status == ProjectGraph.STATUS_FAILED:
            return Response(response_payload, status=status.HTTP_424_FAILED_DEPENDENCY)

        return Response(response_payload, status=status.HTTP_200_OK if was_cached else status.HTTP_201_CREATED)

    def get(self, request, id: int):
        project = get_object_or_404(Project, id=id)
        graph = (
            ProjectGraph.objects.filter(project=project)
            .order_by("-updated_at")
            .first()
        )

        if not graph:
            return Response(
                {
                    "detail": "No dependency graph has been built for this project yet. Trigger POST /api/projects/{id}/dependency-graph/ first."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Pagination for nodes
        try:
            nodes_page_num = int(request.query_params.get("nodes_page", 1))
            nodes_page_size = min(int(request.query_params.get("nodes_page_size", 50)), 200)
        except ValueError:
            nodes_page_num = 1
            nodes_page_size = 50

        # Pagination for edges
        try:
            edges_page_num = int(request.query_params.get("edges_page", 1))
            edges_page_size = min(int(request.query_params.get("edges_page_size", 50)), 200)
        except ValueError:
            edges_page_num = 1
            edges_page_size = 50

        nodes_qs = graph.nodes.order_by("depth", "name", "version")
        edges_qs = graph.edges.order_by("source_name", "target_name")

        nodes_paginator = Paginator(nodes_qs, nodes_page_size)
        edges_paginator = Paginator(edges_qs, edges_page_size)

        nodes_page = nodes_paginator.get_page(nodes_page_num)
        edges_page = edges_paginator.get_page(edges_page_num)

        summary = ProjectGraphSummarySerializer(graph).data

        return Response({
            "graph": summary,
            "nodes": {
                "total_count": nodes_paginator.count,
                "total_pages": nodes_paginator.num_pages,
                "current_page": nodes_page.number,
                "page_size": nodes_page_size,
                "results": ProjectGraphNodeSerializer(nodes_page.object_list, many=True).data,
            },
            "edges": {
                "total_count": edges_paginator.count,
                "total_pages": edges_paginator.num_pages,
                "current_page": edges_page.number,
                "page_size": edges_page_size,
                "results": ProjectGraphEdgeSerializer(edges_page.object_list, many=True).data,
            },
        })


class CacheStatsAPIView(APIView):
    """GET /api/dependency-graph/cache-stats/ - Retrieve package graph cache statistics."""

    def get(self, request):
        stats = CacheManager.get_cache_statistics()
        return Response(stats, status=status.HTTP_200_OK)
