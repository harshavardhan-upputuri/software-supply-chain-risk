"""Service for managing package graph caching and cache statistics."""

import logging
from typing import Any, Dict, Optional, Tuple
from django.db import models, transaction
from django.db.models import Count, Sum
from apps.dependency_graph.models import (
    PackageGraphCache,
    PackageGraphNode,
    PackageGraphEdge,
)
from .deps_dev_client import DepsDevClient

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages reading, fetching, and persisting package dependency graphs."""

    def __init__(self, client: Optional[DepsDevClient] = None):
        self.client = client or DepsDevClient()

    def get_or_fetch_package_graph(
        self,
        ecosystem: str,
        package_name: str,
        version: str,
        force_refresh: bool = False,
    ) -> Tuple[PackageGraphCache, bool]:
        """Retrieve a package version graph from cache or fetch from deps.dev.

        Parameters
        ----------
        ecosystem : 'MAVEN' or 'PYPI'
        package_name : Package coordinate / name
        version : Version string
        force_refresh : Force re-fetching even if valid cached entry exists

        Returns
        -------
        Tuple[PackageGraphCache, bool]
            (cache_entry, was_cache_hit)
        """
        eco_norm = ecosystem.strip().upper()
        pkg_norm = package_name.strip()
        ver_norm = version.strip()

        # Check existing cache entry
        existing = PackageGraphCache.objects.filter(
            ecosystem=eco_norm,
            package_name=pkg_norm,
            version=ver_norm,
        ).first()

        if (
            existing
            and not force_refresh
            and existing.status in (PackageGraphCache.STATUS_COMPLETE, PackageGraphCache.STATUS_EMPTY)
        ):
            # Valid cache hit
            return existing, True

        # Cache miss or forced refresh: fetch from deps.dev API
        res = self.client.fetch_dependencies(eco_norm, pkg_norm, ver_norm)

        # Safety rule: Do not overwrite a valid cached graph with a failed response
        if (
            existing
            and existing.status == PackageGraphCache.STATUS_COMPLETE
            and not res["success"]
        ):
            logger.warning(
                "Fetch failed for %s:%s@%s but keeping valid existing cache entry.",
                eco_norm,
                pkg_norm,
                ver_norm,
            )
            return existing, True

        with transaction.atomic():
            cache_entry, _ = PackageGraphCache.objects.update_or_create(
                ecosystem=eco_norm,
                package_name=pkg_norm,
                version=ver_norm,
                defaults={
                    "status": res["status"],
                    "total_node_count": len(res["nodes"]),
                    "direct_dependency_count": sum(
                        1 for n in res["nodes"] if n.get("relation") == "DIRECT"
                    ),
                    "edge_count": len(res["edges"]),
                    "status_code": res["status_code"],
                    "error_message": res["error_message"],
                    "response_time_ms": res["response_time_ms"],
                },
            )

            # Recreate normalized nodes and edges if response succeeded
            if res["success"]:
                PackageGraphNode.objects.filter(cache=cache_entry).delete()
                PackageGraphEdge.objects.filter(cache=cache_entry).delete()

                node_objs = []
                for idx, node in enumerate(res["nodes"]):
                    vk = node.get("versionKey", {})
                    n_sys = vk.get("system", eco_norm)
                    n_name = vk.get("name", "")
                    n_ver = vk.get("version", "")
                    n_rel = node.get("relation", "")
                    n_err = "; ".join(node.get("errors", [])) if node.get("errors") else ""

                    node_objs.append(
                        PackageGraphNode(
                            cache=cache_entry,
                            node_index=idx,
                            system=n_sys,
                            name=n_name,
                            version=n_ver,
                            relation=n_rel,
                            errors=n_err,
                        )
                    )

                if node_objs:
                    PackageGraphNode.objects.bulk_create(node_objs, ignore_conflicts=True)

                edge_objs = []
                for edge in res["edges"]:
                    f_idx = edge.get("fromNode")
                    t_idx = edge.get("toNode")
                    req = edge.get("requirement", "")
                    if f_idx is not None and t_idx is not None:
                        edge_objs.append(
                            PackageGraphEdge(
                                cache=cache_entry,
                                from_node_index=f_idx,
                                to_node_index=t_idx,
                                requirement=req,
                            )
                        )

                if edge_objs:
                    PackageGraphEdge.objects.bulk_create(edge_objs, ignore_conflicts=True)

        return cache_entry, False

    @staticmethod
    def get_cache_statistics() -> Dict[str, Any]:
        """Calculate and return aggregate cache statistics."""
        total_entries = PackageGraphCache.objects.count()
        complete_count = PackageGraphCache.objects.filter(
            status=PackageGraphCache.STATUS_COMPLETE
        ).count()
        empty_count = PackageGraphCache.objects.filter(
            status=PackageGraphCache.STATUS_EMPTY
        ).count()
        failed_count = PackageGraphCache.objects.filter(
            status=PackageGraphCache.STATUS_FAILED
        ).count()

        by_ecosystem = list(
            PackageGraphCache.objects.values("ecosystem")
            .annotate(
                count=Count("id"),
                complete=Count("id", filter=models.Q(status=PackageGraphCache.STATUS_COMPLETE)),
                failed=Count("id", filter=models.Q(status=PackageGraphCache.STATUS_FAILED)),
            )
        ) if hasattr(models, "Q") else []

        # Simple manual aggregation for ecosystem stats
        maven_total = PackageGraphCache.objects.filter(ecosystem="MAVEN").count()
        maven_complete = PackageGraphCache.objects.filter(
            ecosystem="MAVEN", status=PackageGraphCache.STATUS_COMPLETE
        ).count()
        pypi_total = PackageGraphCache.objects.filter(ecosystem="PYPI").count()
        pypi_complete = PackageGraphCache.objects.filter(
            ecosystem="PYPI", status=PackageGraphCache.STATUS_COMPLETE
        ).count()

        total_nodes = PackageGraphNode.objects.count()
        total_edges = PackageGraphEdge.objects.count()

        return {
            "total_cached_packages": total_entries,
            "complete_count": complete_count,
            "empty_count": empty_count,
            "failed_count": failed_count,
            "ecosystems": {
                "MAVEN": {"total": maven_total, "complete": maven_complete},
                "PYPI": {"total": pypi_total, "complete": pypi_complete},
            },
            "total_normalized_nodes": total_nodes,
            "total_normalized_edges": total_edges,
        }
