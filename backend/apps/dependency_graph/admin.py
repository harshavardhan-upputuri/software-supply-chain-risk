from django.contrib import admin
from .models import (
    Project,
    ProjectPackage,
    PackageGraphCache,
    PackageGraphNode,
    PackageGraphEdge,
    ProjectGraph,
    ProjectGraphNode,
    ProjectGraphEdge,
)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("project_name", "ecosystem", "project_type", "package_count", "created_at")
    search_fields = ("project_name",)
    list_filter = ("ecosystem", "project_type")


@admin.register(ProjectPackage)
class ProjectPackageAdmin(admin.ModelAdmin):
    list_display = ("project", "package_name", "version", "relation_type")
    search_fields = ("package_name", "version")


@admin.register(PackageGraphCache)
class PackageGraphCacheAdmin(admin.ModelAdmin):
    list_display = ("package_name", "version", "ecosystem", "status", "total_node_count", "edge_count")
    list_filter = ("status", "ecosystem")
    search_fields = ("package_name",)


@admin.register(ProjectGraph)
class ProjectGraphAdmin(admin.ModelAdmin):
    list_display = ("project", "status", "total_node_count", "edge_count", "created_at")
    list_filter = ("status",)
