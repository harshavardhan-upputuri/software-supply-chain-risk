"""Tests for Phase 1 Dependency Graph Backend."""

import os
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

# Ensure backend is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(1, str(PROJECT_ROOT))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.test import Client
from apps.dependency_graph.models import (
    Project,
    ProjectPackage,
    PackageGraphCache,
    PackageGraphNode,
    PackageGraphEdge,
    ProjectGraph,
    ProjectGraphNode,
    ProjectGraphEdge,
)
from apps.dependency_graph.services.deps_dev_client import DepsDevClient
from apps.dependency_graph.services.cache_manager import CacheManager
from apps.dependency_graph.services.graph_builder import GraphBuilder


class TestDependencyGraphBackend:
    """Test suite covering Phase 1 models, services, and REST APIs."""

    def setup_method(self):
        """Clean up any leftover test data before each test."""
        Project.objects.filter(project_name__startswith="test-").delete()
        Project.objects.filter(project_name__startswith="builder-test-").delete()
        PackageGraphCache.objects.filter(package_name__startswith="test-").delete()

    def teardown_method(self):
        """Clean up test data after each test."""
        Project.objects.filter(project_name__startswith="test-").delete()
        Project.objects.filter(project_name__startswith="builder-test-").delete()
        PackageGraphCache.objects.filter(package_name__startswith="test-").delete()

    def test_deps_dev_client_url_encoding(self):
        """Verify URL encoding handles Maven coordinates with colons correctly."""
        client = DepsDevClient(base_url="https://api.deps.dev/v3")
        with patch.object(client.session, "get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "nodes": [
                    {"versionKey": {"system": "MAVEN", "name": "org.test:pkg", "version": "1.0"}, "relation": "SELF"},
                    {"versionKey": {"system": "MAVEN", "name": "org.dep:child", "version": "2.0"}, "relation": "DIRECT"},
                ],
                "edges": [{"fromNode": 0, "toNode": 1, "requirement": ">=2.0"}],
            }
            mock_get.return_value = mock_resp

            res = client.fetch_dependencies("MAVEN", "org.test:pkg", "1.0")
            assert res["success"] is True
            assert res["status"] == "COMPLETE"
            assert len(res["nodes"]) == 2
            assert len(res["edges"]) == 1

            called_url = mock_get.call_args[0][0]
            assert "org.test%3Apkg" in called_url
            assert "1.0:dependencies" in called_url

    def test_project_model_and_packages(self):
        """Verify Project and ProjectPackage relational models and constraints."""
        uid = uuid.uuid4().hex[:8]
        proj_name = f"test-org/test-project-{uid}"
        project = Project.objects.create(
            ecosystem="PYPI",
            project_name=proj_name,
            project_type="GITHUB",
            package_count=2,
        )
        assert project.id is not None
        assert str(project) == f"PYPI:{proj_name}"

        pkg1 = ProjectPackage.objects.create(
            project=project,
            package_name=f"test-pkg-a-{uid}",
            version="1.0.0",
            relation_type="SOURCE_REPO_TYPE",
            relation_provenance="VERIFIED",
        )
        pkg2 = ProjectPackage.objects.create(
            project=project,
            package_name=f"test-pkg-b-{uid}",
            version="2.0.0",
            relation_type="SOURCE_REPO_TYPE",
            relation_provenance="VERIFIED",
        )
        assert project.packages.count() == 2

    def test_cache_manager_reuse(self):
        """Verify CacheManager caches responses and avoids duplicate API calls."""
        uid = uuid.uuid4().hex[:8]
        pkg_name = f"test-cached-pkg-{uid}"

        client = MagicMock()
        client.fetch_dependencies.return_value = {
            "success": True,
            "status_code": 200,
            "status": "COMPLETE",
            "error_message": "",
            "response_time_ms": 42.0,
            "nodes": [
                {"versionKey": {"system": "PYPI", "name": pkg_name, "version": "1.0.0"}, "relation": "SELF"},
                {"versionKey": {"system": "PYPI", "name": f"child-{uid}", "version": "0.5.0"}, "relation": "DIRECT"},
            ],
            "edges": [{"fromNode": 0, "toNode": 1, "requirement": ""}],
            "raw_response": {},
        }

        manager = CacheManager(client=client)
        entry1, hit1 = manager.get_or_fetch_package_graph("PYPI", pkg_name, "1.0.0")
        assert hit1 is False
        assert client.fetch_dependencies.call_count == 1
        assert entry1.status == PackageGraphCache.STATUS_COMPLETE

        # Second retrieval must be a cache hit
        entry2, hit2 = manager.get_or_fetch_package_graph("PYPI", pkg_name, "1.0.0")
        assert hit2 is True
        assert client.fetch_dependencies.call_count == 1  # Unchanged
        assert entry2.id == entry1.id

    def test_graph_builder_merging_and_depths(self):
        """Verify GraphBuilder merges packages, preserves original vs transitive, and assigns depths."""
        uid = uuid.uuid4().hex[:8]
        root_name = f"test-root-pkg-{uid}"
        direct_name = f"test-direct-dep-{uid}"
        trans_name = f"test-transitive-dep-{uid}"

        project = Project.objects.create(
            ecosystem="PYPI",
            project_name=f"builder-test-app-{uid}",
            project_type="GITHUB",
            package_count=1,
        )
        ProjectPackage.objects.create(
            project=project,
            package_name=root_name,
            version="1.0.0",
            relation_type="SOURCE",
        )

        mock_cache = MagicMock()
        cache_entry = PackageGraphCache.objects.create(
            ecosystem="PYPI",
            package_name=root_name,
            version="1.0.0",
            status=PackageGraphCache.STATUS_COMPLETE,
            total_node_count=3,
            edge_count=2,
        )
        PackageGraphNode.objects.create(cache=cache_entry, node_index=0, system="PYPI", name=root_name, version="1.0.0", relation="SELF")
        PackageGraphNode.objects.create(cache=cache_entry, node_index=1, system="PYPI", name=direct_name, version="2.0.0", relation="DIRECT")
        PackageGraphNode.objects.create(cache=cache_entry, node_index=2, system="PYPI", name=trans_name, version="3.0.0", relation="INDIRECT")

        PackageGraphEdge.objects.create(cache=cache_entry, from_node_index=0, to_node_index=1)
        PackageGraphEdge.objects.create(cache=cache_entry, from_node_index=1, to_node_index=2)

        mock_cache.get_or_fetch_package_graph.return_value = (cache_entry, True)

        builder = GraphBuilder(cache_manager=mock_cache)
        graph, was_cached, stats = builder.build_project_graph(project, force_rebuild=True)

        assert graph.status == ProjectGraph.STATUS_COMPLETE
        assert graph.total_node_count == 3
        assert graph.direct_package_count == 1  # root_name is original
        assert graph.transitive_node_count == 2
        assert graph.edge_count == 2

        # Check nodes stored in DB
        root_node = ProjectGraphNode.objects.get(project_graph=graph, name=root_name)
        assert root_node.is_original_project_package is True
        assert root_node.depth == 0

        direct_node = ProjectGraphNode.objects.get(project_graph=graph, name=direct_name)
        assert direct_node.is_original_project_package is False
        assert direct_node.depth == 1
        assert direct_node.relation == "DIRECT"

        trans_node = ProjectGraphNode.objects.get(project_graph=graph, name=trans_name)
        assert trans_node.is_original_project_package is False
        assert trans_node.depth == 2
        assert trans_node.relation == "INDIRECT"

    def test_api_endpoints(self):
        """Test all REST API endpoints under /api/."""
        client = Client()

        # 1. GET /api/projects/
        resp = client.get("/api/projects/")
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) >= 10

        # Filter by ecosystem
        resp_maven = client.get("/api/projects/?ecosystem=MAVEN")
        assert resp_maven.status_code == 200
        for p in resp_maven.json()["results"]:
            assert p["ecosystem"] == "MAVEN"

        # 2. GET /api/projects/{id}/
        first_id = data["results"][0]["id"]
        resp_detail = client.get(f"/api/projects/{first_id}/")
        assert resp_detail.status_code == 200
        detail = resp_detail.json()
        assert "packages" in detail
        assert len(detail["packages"]) >= 1

        # Unknown ID returns 404
        resp_404 = client.get("/api/projects/999999/")
        assert resp_404.status_code == 404

        # 3. GET /api/dependency-graph/cache-stats/
        resp_stats = client.get("/api/dependency-graph/cache-stats/")
        assert resp_stats.status_code == 200
        stats = resp_stats.json()
        assert "total_cached_packages" in stats
        assert "ecosystems" in stats

        # 4. GET /api/projects/{id}/dependency-graph/ before build (for an unbuilt project)
        unbuilt = Project.objects.filter(graphs__isnull=True).first()
        if unbuilt:
            resp_no_graph = client.get(f"/api/projects/{unbuilt.id}/dependency-graph/")
            assert resp_no_graph.status_code == 404
