"""Models for dependency graph backend."""

from django.db import models


class Project(models.Model):
    """An open-source or repository project (e.g. from Maven or PyPI)."""

    ecosystem = models.CharField(max_length=50, db_index=True)  # MAVEN, PYPI
    project_type = models.CharField(max_length=50, db_index=True)  # GITHUB, BITBUCKET, etc.
    project_name = models.CharField(max_length=255, db_index=True)
    project_match_status = models.CharField(max_length=50, blank=True, default="")

    open_issues_count = models.IntegerField(null=True, blank=True)
    stars_count = models.IntegerField(null=True, blank=True)
    forks_count = models.IntegerField(null=True, blank=True)
    licenses = models.TextField(blank=True, default="")
    description = models.TextField(blank=True, default="")
    homepage = models.URLField(max_length=1000, blank=True, default="")

    package_count = models.IntegerField(default=0)
    version_count = models.IntegerField(default=0)
    relationship_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "projects"
        constraints = [
            models.UniqueConstraint(
                fields=["ecosystem", "project_name"],
                name="unique_project_ecosystem_name",
            )
        ]
        indexes = [
            models.Index(fields=["ecosystem", "project_name"]),
            models.Index(fields=["ecosystem", "package_count"]),
        ]

    def __str__(self):
        return f"{self.ecosystem}:{self.project_name}"


class ProjectPackage(models.Model):
    """An original package associated with a Project from the source dataset."""

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="packages"
    )
    package_name = models.CharField(max_length=255, db_index=True)
    version = models.CharField(max_length=100, db_index=True)
    relation_type = models.CharField(max_length=100, blank=True, default="")
    relation_provenance = models.CharField(max_length=100, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_packages"
        constraints = [
            models.UniqueConstraint(
                fields=["project", "package_name", "version", "relation_type"],
                name="unique_project_package_relation",
            )
        ]
        indexes = [
            models.Index(fields=["package_name", "version"]),
        ]

    def __str__(self):
        return f"{self.project_id} -> {self.package_name}@{self.version}"


class PackageGraphCache(models.Model):
    """Cached dependency graph resolution for a single package version from deps.dev."""

    STATUS_PENDING = "PENDING"
    STATUS_COMPLETE = "COMPLETE"
    STATUS_EMPTY = "EMPTY"
    STATUS_FAILED = "FAILED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_COMPLETE, "Complete"),
        (STATUS_EMPTY, "Empty"),
        (STATUS_FAILED, "Failed"),
    ]

    ecosystem = models.CharField(max_length=50, db_index=True)  # MAVEN, PYPI
    package_name = models.CharField(max_length=255, db_index=True)
    version = models.CharField(max_length=100, db_index=True)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True
    )
    total_node_count = models.IntegerField(default=0)
    direct_dependency_count = models.IntegerField(default=0)
    edge_count = models.IntegerField(default=0)

    status_code = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")
    response_time_ms = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "package_graph_cache"
        constraints = [
            models.UniqueConstraint(
                fields=["ecosystem", "package_name", "version"],
                name="unique_package_version_cache",
            )
        ]
        indexes = [
            models.Index(fields=["ecosystem", "package_name", "version"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.ecosystem}:{self.package_name}@{self.version} ({self.status})"


class PackageGraphNode(models.Model):
    """Normalized node within a PackageGraphCache."""

    cache = models.ForeignKey(
        PackageGraphCache, on_delete=models.CASCADE, related_name="nodes"
    )
    node_index = models.IntegerField()
    system = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=100, blank=True, default="")
    relation = models.CharField(max_length=50, blank=True, default="")  # DIRECT, INDIRECT, SELF
    errors = models.TextField(blank=True, default="")

    class Meta:
        db_table = "package_graph_nodes"
        constraints = [
            models.UniqueConstraint(
                fields=["cache", "node_index"],
                name="unique_cache_node_index",
            )
        ]
        indexes = [
            models.Index(fields=["cache", "name"]),
        ]

    def __str__(self):
        return f"Node {self.node_index}: {self.name}@{self.version}"


class PackageGraphEdge(models.Model):
    """Normalized edge between nodes in a PackageGraphCache."""

    cache = models.ForeignKey(
        PackageGraphCache, on_delete=models.CASCADE, related_name="edges"
    )
    from_node_index = models.IntegerField()
    to_node_index = models.IntegerField()
    requirement = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "package_graph_edges"
        indexes = [
            models.Index(fields=["cache", "from_node_index"]),
            models.Index(fields=["cache", "to_node_index"]),
        ]

    def __str__(self):
        return f"Edge {self.from_node_index} -> {self.to_node_index}"


class ProjectGraph(models.Model):
    """Constructed project-level dependency graph combining its packages' graphs."""

    STATUS_PENDING = "PENDING"
    STATUS_COMPLETE = "COMPLETE"
    STATUS_PARTIAL = "PARTIAL"
    STATUS_FAILED = "FAILED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_COMPLETE, "Complete"),
        (STATUS_PARTIAL, "Partial"),
        (STATUS_FAILED, "Failed"),
    ]

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="graphs"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True
    )
    input_fingerprint = models.CharField(max_length=64, db_index=True)

    total_node_count = models.IntegerField(default=0)
    direct_package_count = models.IntegerField(default=0)
    transitive_node_count = models.IntegerField(default=0)
    edge_count = models.IntegerField(default=0)

    error_summary = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "project_graphs"
        indexes = [
            models.Index(fields=["project", "input_fingerprint"]),
            models.Index(fields=["project", "status"]),
        ]

    def __str__(self):
        return f"Graph for {self.project.project_name} ({self.status})"


class ProjectGraphNode(models.Model):
    """Normalized node within a ProjectGraph."""

    project_graph = models.ForeignKey(
        ProjectGraph, on_delete=models.CASCADE, related_name="nodes"
    )
    system = models.CharField(max_length=50)
    name = models.CharField(max_length=255, db_index=True)
    version = models.CharField(max_length=100, blank=True, default="")
    is_original_project_package = models.BooleanField(default=False, db_index=True)
    relation = models.CharField(max_length=50, blank=True, default="")  # DIRECT, INDIRECT, ROOT
    depth = models.IntegerField(default=0)

    class Meta:
        db_table = "project_graph_nodes"
        constraints = [
            models.UniqueConstraint(
                fields=["project_graph", "system", "name", "version"],
                name="unique_project_graph_node",
            )
        ]
        indexes = [
            models.Index(fields=["project_graph", "is_original_project_package"]),
            models.Index(fields=["project_graph", "name"]),
        ]

    def __str__(self):
        return f"{self.name}@{self.version} (orig={self.is_original_project_package})"


class ProjectGraphEdge(models.Model):
    """Normalized directed edge within a ProjectGraph."""

    project_graph = models.ForeignKey(
        ProjectGraph, on_delete=models.CASCADE, related_name="edges"
    )
    source_system = models.CharField(max_length=50)
    source_name = models.CharField(max_length=255)
    source_version = models.CharField(max_length=100, blank=True, default="")
    target_system = models.CharField(max_length=50)
    target_name = models.CharField(max_length=255)
    target_version = models.CharField(max_length=100, blank=True, default="")
    requirement = models.CharField(max_length=255, blank=True, default="")
    relation = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = "project_graph_edges"
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "project_graph",
                    "source_name",
                    "source_version",
                    "target_name",
                    "target_version",
                ],
                name="unique_project_graph_edge",
            )
        ]
        indexes = [
            models.Index(fields=["project_graph", "source_name"]),
            models.Index(fields=["project_graph", "target_name"]),
        ]

    def __str__(self):
        return f"{self.source_name} -> {self.target_name}"
