"""Service for building, merging, and persisting project-level dependency graphs."""

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
import networkx as nx
from django.db import transaction
from django.utils import timezone
from apps.dependency_graph.models import (
    Project,
    ProjectPackage,
    PackageGraphCache,
    ProjectGraph,
    ProjectGraphNode,
    ProjectGraphEdge,
)
from .cache_manager import CacheManager

logger = logging.getLogger(__name__)


class GraphBuilder:
    """Builds and caches project-level dependency graphs by merging package graphs."""

    def __init__(self, cache_manager: Optional[CacheManager] = None):
        self.cache_manager = cache_manager or CacheManager()

    @staticmethod
    def calculate_project_fingerprint(project: Project) -> str:
        """Calculate SHA-256 fingerprint from sorted project packages and versions."""
        packages = project.packages.order_by("package_name", "version", "relation_type")
        items = [
            f"{p.package_name}|{p.version}|{p.relation_type}"
            for p in packages
        ]
        raw_repr = "||".join(items)
        return hashlib.sha256(raw_repr.encode("utf-8")).hexdigest()

    def build_project_graph(
        self,
        project: Project,
        force_rebuild: bool = False,
    ) -> Tuple[ProjectGraph, bool, Dict[str, Any]]:
        """Construct or retrieve a project-level dependency graph.

        Parameters
        ----------
        project : Project instance
        force_rebuild : If True, re-fetches missing or stale package graphs and rebuilds

        Returns
        -------
        Tuple[ProjectGraph, bool, Dict[str, Any]]
            (project_graph, was_cached, execution_stats)
        """
        fingerprint = self.calculate_project_fingerprint(project)

        # Check existing project graph with matching fingerprint
        if not force_rebuild:
            existing_graph = (
                ProjectGraph.objects.filter(
                    project=project,
                    input_fingerprint=fingerprint,
                )
                .order_by("-updated_at")
                .first()
            )
            if existing_graph and existing_graph.status in (
                ProjectGraph.STATUS_COMPLETE,
                ProjectGraph.STATUS_PARTIAL,
            ):
                stats = {
                    "was_cached": True,
                    "packages_processed": 0,
                    "api_requests": 0,
                    "cache_hits": 0,
                    "fetch_errors": [],
                }
                return existing_graph, True, stats

        # Retrieve all original packages
        project_packages = list(project.packages.all())
        total_pkg_count = len(project_packages)

        # Track stats
        api_requests = 0
        cache_hits = 0
        fetch_errors = []
        successful_cache_entries: List[PackageGraphCache] = []

        # Original package keys for membership testing: (name, version)
        original_keys: Set[Tuple[str, str]] = {
            (p.package_name.strip(), p.version.strip()) for p in project_packages
        }

        # Step 1: Process each package version
        for pkg in project_packages:
            try:
                cache_entry, hit = self.cache_manager.get_or_fetch_package_graph(
                    ecosystem=project.ecosystem,
                    package_name=pkg.package_name,
                    version=pkg.version,
                    force_refresh=force_rebuild,
                )

                if hit:
                    cache_hits += 1
                else:
                    api_requests += 1

                if cache_entry.status in (
                    PackageGraphCache.STATUS_COMPLETE,
                    PackageGraphCache.STATUS_EMPTY,
                ):
                    successful_cache_entries.append(cache_entry)
                else:
                    err_msg = f"{pkg.package_name}@{pkg.version}: {cache_entry.error_message or 'Resolution failed'}"
                    fetch_errors.append(err_msg)

            except Exception as e:
                api_requests += 1
                fetch_errors.append(f"{pkg.package_name}@{pkg.version}: {e}")

        # Step 2: Determine completeness status
        success_count = len(successful_cache_entries)
        if total_pkg_count == 0:
            status = ProjectGraph.STATUS_COMPLETE
        elif success_count == total_pkg_count:
            status = ProjectGraph.STATUS_COMPLETE
        elif success_count > 0:
            status = ProjectGraph.STATUS_PARTIAL
        else:
            status = ProjectGraph.STATUS_FAILED

        # Step 3: Merge graphs using NetworkX
        nx_graph = nx.DiGraph()

        # Add all original packages as root nodes in the graph first
        for pkg in project_packages:
            k = (project.ecosystem, pkg.package_name.strip(), pkg.version.strip())
            nx_graph.add_node(
                k,
                system=project.ecosystem,
                name=pkg.package_name.strip(),
                version=pkg.version.strip(),
                is_original=True,
                relation="ROOT",
                depth=0,
            )

        # Merge package graphs
        for cache_entry in successful_cache_entries:
            # Map node_index to node details
            nodes = list(cache_entry.nodes.all())
            edges = list(cache_entry.edges.all())
            node_map: Dict[int, Tuple[str, str, str]] = {}

            for n in nodes:
                n_sys = n.system or project.ecosystem
                n_key = (n_sys, n.name.strip(), n.version.strip() if n.version else "")
                node_map[n.node_index] = n_key

                is_orig = (n.name.strip(), n.version.strip() if n.version else "") in original_keys
                if n_key not in nx_graph:
                    nx_graph.add_node(
                        n_key,
                        system=n_sys,
                        name=n.name.strip(),
                        version=n.version.strip() if n.version else "",
                        is_original=is_orig,
                        relation=n.relation or ("DIRECT" if is_orig else "INDIRECT"),
                        depth=0 if is_orig else 9999,
                    )
                else:
                    if is_orig:
                        nx_graph.nodes[n_key]["is_original"] = True
                        nx_graph.nodes[n_key]["depth"] = 0

            for edge in edges:
                src_key = node_map.get(edge.from_node_index)
                tgt_key = node_map.get(edge.to_node_index)
                if src_key and tgt_key and src_key != tgt_key:
                    if not nx_graph.has_edge(src_key, tgt_key):
                        nx_graph.add_edge(
                            src_key,
                            tgt_key,
                            requirement=edge.requirement,
                        )

        # Step 4: Compute depths from roots
        root_nodes = [
            n for n, d in nx_graph.nodes(data=True) if d.get("is_original") is True
        ]
        if not root_nodes:
            # Fallback to zero in-degree nodes
            root_nodes = [n for n in nx_graph.nodes() if nx_graph.in_degree(n) == 0]

        for root in root_nodes:
            try:
                lengths = nx.single_source_shortest_path_length(nx_graph, root)
                for target_node, dist in lengths.items():
                    current_depth = nx_graph.nodes[target_node].get("depth", 999)
                    if dist < current_depth:
                        nx_graph.nodes[target_node]["depth"] = dist
                        if dist == 0:
                            nx_graph.nodes[target_node]["relation"] = "ROOT"
                        elif dist == 1:
                            nx_graph.nodes[target_node]["relation"] = "DIRECT"
                        else:
                            nx_graph.nodes[target_node]["relation"] = "INDIRECT"
            except Exception:
                pass

        for node, data in nx_graph.nodes(data=True):
            if data.get("depth", 9999) >= 9999:
                data["depth"] = 1
                data["relation"] = "DIRECT"

        # Step 5: Persist ProjectGraph and normalized entities atomically
        with transaction.atomic():
            project_graph, _ = ProjectGraph.objects.update_or_create(
                project=project,
                input_fingerprint=fingerprint,
                defaults={
                    "status": status,
                    "total_node_count": nx_graph.number_of_nodes(),
                    "direct_package_count": sum(
                        1 for _, d in nx_graph.nodes(data=True) if d.get("is_original")
                    ),
                    "transitive_node_count": sum(
                        1 for _, d in nx_graph.nodes(data=True) if not d.get("is_original")
                    ),
                    "edge_count": nx_graph.number_of_edges(),
                    "error_summary": "; ".join(fetch_errors),
                },
            )

            # Recreate project graph nodes and edges
            ProjectGraphNode.objects.filter(project_graph=project_graph).delete()
            ProjectGraphEdge.objects.filter(project_graph=project_graph).delete()

            node_records = []
            for (n_sys, n_name, n_ver), data in nx_graph.nodes(data=True):
                node_records.append(
                    ProjectGraphNode(
                        project_graph=project_graph,
                        system=n_sys,
                        name=n_name,
                        version=n_ver,
                        is_original_project_package=data.get("is_original", False),
                        relation=data.get("relation", "DIRECT"),
                        depth=data.get("depth", 0),
                    )
                )

            if node_records:
                ProjectGraphNode.objects.bulk_create(node_records, ignore_conflicts=True)

            edge_records = []
            seen_edges = set()
            for u, v, data in nx_graph.edges(data=True):
                src_sys, src_name, src_ver = u
                tgt_sys, tgt_name, tgt_ver = v
                edge_key = (src_name, src_ver, tgt_name, tgt_ver)
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edge_records.append(
                        ProjectGraphEdge(
                            project_graph=project_graph,
                            source_system=src_sys,
                            source_name=src_name,
                            source_version=src_ver,
                            target_system=tgt_sys,
                            target_name=tgt_name,
                            target_version=tgt_ver,
                            requirement=data.get("requirement", ""),
                            relation=nx_graph.nodes[v].get("relation", ""),
                        )
                    )

            if edge_records:
                ProjectGraphEdge.objects.bulk_create(edge_records, ignore_conflicts=True)

        stats = {
            "was_cached": False,
            "packages_processed": total_pkg_count,
            "api_requests": api_requests,
            "cache_hits": cache_hits,
            "fetch_errors": fetch_errors,
        }

        return project_graph, False, stats
