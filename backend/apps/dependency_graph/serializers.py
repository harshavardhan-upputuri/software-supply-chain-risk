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
            "created_at",
        ]

    def get_has_graph(self, obj) -> bool:
        return obj.graphs.exists()


class ProjectDetailSerializer(serializers.ModelSerializer):
    packages = ProjectPackageSerializer(many=True, read_only=True)
    graphs = serializers.SerializerMethodField()

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
            "created_at",
            "updated_at",
        ]

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
