"""Serializers for dependency graph REST API."""

from rest_framework import serializers
from .models import (
    Project,
    ProjectPackage,
    PackageGraphCache,
    ProjectGraph,
    ProjectGraphNode,
    ProjectGraphEdge,
)


class ProjectPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectPackage
        fields = [
            "id",
            "package_name",
            "version",
            "relation_type",
            "relation_provenance",
            "created_at",
        ]


class ProjectListSerializer(serializers.ModelSerializer):
    has_graph = serializers.SerializerMethodField()
    vulnerability_status = serializers.SerializerMethodField()
    vulnerable_packages_count = serializers.SerializerMethodField()
    findings_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "ecosystem",
            "project_type",
            "project_name",
            "project_match_status",
            "package_count",
            "version_count",
            "relationship_count",
            "has_graph",
            "vulnerability_status",
            "vulnerable_packages_count",
            "findings_count",
            "created_at",
        ]

    def _get_vuln_summary(self, obj):
        summaries = self.context.get("vulnerability_summaries")
        if summaries is not None:
            return summaries.get(obj.id, {})
        from .services.vulnerability_service import VulnerabilityService
        single_res = VulnerabilityService.get_projects_vulnerability_summary([obj.id])
        return single_res.get(obj.id, {})

    def get_has_graph(self, obj) -> bool:
        return obj.graphs.exists()

    def get_vulnerability_status(self, obj) -> str:
        summary = self._get_vuln_summary(obj)
        return summary.get("vulnerability_status", "not_analyzed")

    def get_vulnerable_packages_count(self, obj) -> int:
        summary = self._get_vuln_summary(obj)
        return summary.get("vulnerable_packages_count", 0)

    def get_findings_count(self, obj) -> int:
        summary = self._get_vuln_summary(obj)
        return summary.get("findings_count", 0)


class ProjectDetailSerializer(serializers.ModelSerializer):
    packages = ProjectPackageSerializer(many=True, read_only=True)
    graphs = serializers.SerializerMethodField()
    vulnerability_status = serializers.SerializerMethodField()
    vulnerable_packages_count = serializers.SerializerMethodField()
    findings_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "ecosystem",
            "project_type",
            "project_name",
            "project_match_status",
            "open_issues_count",
            "stars_count",
            "forks_count",
            "licenses",
            "description",
            "homepage",
            "package_count",
            "version_count",
            "relationship_count",
            "packages",
            "graphs",
            "vulnerability_status",
            "vulnerable_packages_count",
            "findings_count",
            "created_at",
            "updated_at",
        ]

    def _get_vuln_summary(self, obj):
        summaries = self.context.get("vulnerability_summaries")
        if summaries is not None:
            return summaries.get(obj.id, {})
        from .services.vulnerability_service import VulnerabilityService
        single_res = VulnerabilityService.get_projects_vulnerability_summary([obj.id])
        return single_res.get(obj.id, {})

    def get_vulnerability_status(self, obj) -> str:
        summary = self._get_vuln_summary(obj)
        return summary.get("vulnerability_status", "not_analyzed")

    def get_vulnerable_packages_count(self, obj) -> int:
        summary = self._get_vuln_summary(obj)
        return summary.get("vulnerable_packages_count", 0)

    def get_findings_count(self, obj) -> int:
        summary = self._get_vuln_summary(obj)
        return summary.get("findings_count", 0)

    def get_graphs(self, obj):
        latest = obj.graphs.order_by("-updated_at").first()
        if not latest:
            return None
        return {
            "id": latest.id,
            "status": latest.status,
            "input_fingerprint": latest.input_fingerprint,
            "total_node_count": latest.total_node_count,
            "direct_package_count": latest.direct_package_count,
            "transitive_node_count": latest.transitive_node_count,
            "edge_count": latest.edge_count,
            "updated_at": latest.updated_at,
        }


class ProjectGraphNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectGraphNode
        fields = [
            "id",
            "system",
            "name",
            "version",
            "is_original_project_package",
            "relation",
            "depth",
        ]


class ProjectGraphEdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectGraphEdge
        fields = [
            "id",
            "source_system",
            "source_name",
            "source_version",
            "target_system",
            "target_name",
            "target_version",
            "requirement",
            "relation",
        ]


class ProjectGraphSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectGraph
        fields = [
            "id",
            "project_id",
            "status",
            "input_fingerprint",
            "total_node_count",
            "direct_package_count",
            "transitive_node_count",
            "edge_count",
            "error_summary",
            "created_at",
            "updated_at",
        ]
