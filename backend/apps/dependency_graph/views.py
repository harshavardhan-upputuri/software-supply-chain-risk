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
from .services.project_importer import ProjectImporterService
from .services.vulnerability_service import VulnerabilityService

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

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            project_ids = [p.id for p in page]
            vuln_summaries = VulnerabilityService.get_projects_vulnerability_summary(project_ids)
            serializer = self.get_serializer(page, many=True, context={"vulnerability_summaries": vuln_summaries})
            return self.get_paginated_response(serializer.data)

        project_ids = list(queryset.values_list("id", flat=True))
        vuln_summaries = VulnerabilityService.get_projects_vulnerability_summary(project_ids)
        serializer = self.get_serializer(queryset, many=True, context={"vulnerability_summaries": vuln_summaries})
        return Response(serializer.data)


class ProjectDetailAPIView(generics.RetrieveAPIView):
    """GET /api/projects/{id}/ - Project metadata and original packages list."""

    queryset = Project.objects.prefetch_related("packages").all()
    serializer_class = ProjectDetailSerializer
    lookup_field = "id"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        vuln_summaries = VulnerabilityService.get_projects_vulnerability_summary([instance.id])
        serializer = self.get_serializer(instance, context={"vulnerability_summaries": vuln_summaries})
        return Response(serializer.data)


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


class ImportNextProjectAPIView(APIView):
    """POST /api/projects/import-next/ - Import exactly one new eligible project from the dataset CSV."""

    def post(self, request):
        importer = ProjectImporterService()
        try:
            project, is_end, info = importer.import_next_project()
        except FileNotFoundError as e:
            logger.error("Dataset file error: %s", e)
            return Response(
                {"error": str(e)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.exception("Failed to import next project: %s", e)
            return Response(
                {"error": f"Failed to import project: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if is_end or not project:
            return Response(
                {
                    "message": info.get("message", "No more eligible unimported projects remaining in the dataset."),
                    "project": None,
                    "rows_scanned": info.get("rows_scanned", 0),
                    "projects_imported": info.get("projects_imported", 0),
                    "is_end_of_dataset": True,
                },
                status=status.HTTP_200_OK,
            )

        serialized_project = ProjectListSerializer(project).data
        return Response(
            {
                "message": info.get("message", f"Project imported successfully: {project.project_name}"),
                "project": serialized_project,
                "rows_scanned": info.get("rows_scanned", 0),
                "projects_imported": info.get("projects_imported", 0),
                "is_end_of_dataset": False,
            },
            status=status.HTTP_201_CREATED,
        )


class ProjectVulnerabilityAnalysisAPIView(APIView):
    """POST /api/projects/{id}/vulnerabilities/analyze/

    Runs cache-first vulnerability analysis on package versions in the project's
    existing dependency graph. Does not modify or rebuild any dependency graph data.
    """

    def post(self, request, id: int):
        project = get_object_or_404(Project, id=id)

        vuln_service = VulnerabilityService()
        result = vuln_service.analyze_project_graph(project.id)

        if result.get("error") and not result.get("summary"):
            return Response(
                {"error": result["error"]},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "project_id": project.id,
                "project_name": project.project_name,
                "summary": result["summary"],
                "packages": result["packages"],
                "findings": result["findings"],
            },
            status=status.HTTP_200_OK,
        )


class VulnerabilityDashboardStatsAPIView(APIView):
    """GET /api/vulnerabilities/dashboard-stats/

    Aggregates global vulnerability metrics and returns the 10 most recent
    stored vulnerability findings across analyzed projects purely from database records.
    Never calls OSV.dev or network APIs.
    """

    def get(self, request):
        # 1. Analyzed projects from project vulnerability summary
        summaries = VulnerabilityService.get_projects_vulnerability_summary()
        analyzed_projects_count = sum(
            1 for v in summaries.values() if v["vulnerability_status"] in ("vulnerable", "safe")
        )

        # 2. Total checked packages recorded in cache
        from .models import PackageVulnerabilityCache, VulnerabilityFinding
        total_checked_packages = PackageVulnerabilityCache.objects.count()

        # 3. Unique package versions confirmed vulnerable
        vulnerable_packages_count = PackageVulnerabilityCache.objects.filter(
            check_status=PackageVulnerabilityCache.STATUS_VULNERABLE
        ).count()

        # 4. Total distinct vulnerability advisory findings
        total_advisory_findings = VulnerabilityFinding.objects.count()

        # 5. Critical findings
        critical_findings_count = VulnerabilityFinding.objects.filter(
            severity__icontains="CRITICAL"
        ).count()

        # 6. Map package versions to their associated projects
        recent_findings_qs = (
            VulnerabilityFinding.objects.select_related("cache")
            .order_by("-created_at")[:10]
        )

        node_projects = (
            ProjectGraphNode.objects.select_related("project_graph__project")
            .exclude(version="")
            .values(
                "system",
                "name",
                "version",
                "project_graph__project__id",
                "project_graph__project__project_name",
            )
            .distinct()
        )

        pkg_to_projects = {}
        for row in node_projects:
            eco = row["system"].upper()
            name = row["name"].lower() if eco == "PYPI" else row["name"]
            key = (eco, name, row["version"])
            if key not in pkg_to_projects:
                pkg_to_projects[key] = []
            proj_info = {
                "id": row["project_graph__project__id"],
                "project_name": row["project_graph__project__project_name"],
            }
            if proj_info not in pkg_to_projects[key]:
                pkg_to_projects[key].append(proj_info)

        recent_findings = []
        for f in recent_findings_qs:
            cache = f.cache
            key = (cache.ecosystem, cache.package_name, cache.package_version)
            associated = pkg_to_projects.get(key, [])
            primary_project = associated[0] if associated else None

            recent_findings.append({
                "id": f.id,
                "vulnerability_id": f.vulnerability_id,
                "package_name": cache.package_name,
                "package_version": cache.package_version,
                "ecosystem": cache.ecosystem,
                "severity": f.severity,
                "summary": f.summary,
                "fixed_version": f.fixed_version,
                "advisory_url": f.advisory_url,
                "project": primary_project,
                "associated_projects": associated,
            })

        return Response(
            {
                "summary": {
                    "analyzed_projects_count": analyzed_projects_count,
                    "checked_packages_count": total_checked_packages,
                    "vulnerable_packages_count": vulnerable_packages_count,
                    "advisory_findings_count": total_advisory_findings,
                    "critical_findings_count": critical_findings_count,
                    "cache_hits_count": None,  # Explicitly omitted/null since per-request cache hit counters are transient
                },
                "recent_findings": recent_findings,
            },
            status=status.HTTP_200_OK,
        )

