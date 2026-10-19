"""Pilot script to sample package versions and resolve dependencies via deps.dev API.

This script:
1. Selects 10 distinct Maven and 10 distinct PyPI package-version pairs using DuckDB.
2. Saves the sample to data/processed/dependency_graph/package_version_sample.csv.
3. Queries deps.dev dependency API with timeout and bounded retries.
4. Saves request statuses to data/processed/dependency_graph/api_request_status.csv.
5. Saves extracted dependency edges to data/processed/dependency_graph/dependency_edges.csv.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import duckdb

DEPS_DEV_API_BASE = "https://api.deps.dev/v3/systems"
DEFAULT_USER_AGENT = "academic-supply-chain-researcher/1.0"


def select_package_version_sample(
    maven_csv: str | Path = "data/maven_20k.csv",
    pypi_csv: str | Path = "data/pypi.csv",
    output_sample_csv: str | Path = "data/processed/dependency_graph/package_version_sample.csv",
    maven_limit: int = 10,
    pypi_limit: int = 10,
) -> List[Dict[str, str]]:
    """Select distinct Maven and PyPI package-version pairs using DuckDB.

    Parameters
    ----------
    maven_csv : Path to Maven CSV.
    pypi_csv : Path to PyPI CSV.
    output_sample_csv : Path to output sample CSV.
    maven_limit : Number of Maven pairs to select.
    pypi_limit : Number of PyPI pairs to select.

    Returns
    -------
    List[Dict[str, str]]
        List of selected package-version records.
    """
    out_path = Path(output_sample_csv).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect(":memory:")
    try:
        query = f"""
            SELECT 'MAVEN' AS System, Name AS PackageName, Version
            FROM read_csv(
                '{Path(maven_csv).resolve().as_posix()}',
                header = true,
                quote = '"',
                escape = '"',
                max_line_size = 2000000,
                types = {{'Version': 'VARCHAR', 'Name': 'VARCHAR'}}
            )
            GROUP BY Name, Version
            LIMIT {maven_limit}
        """
        maven_rows = con.execute(query).fetchall()

        query_pypi = f"""
            SELECT 'PYPI' AS System, Name AS PackageName, Version
            FROM read_csv(
                '{Path(pypi_csv).resolve().as_posix()}',
                header = true,
                quote = '"',
                escape = '"',
                max_line_size = 2000000,
                types = {{'Version': 'VARCHAR', 'Name': 'VARCHAR'}}
            )
            GROUP BY Name, Version
            LIMIT {pypi_limit}
        """
        pypi_rows = con.execute(query_pypi).fetchall()

        samples = []
        for r in maven_rows:
            samples.append({"System": r[0], "PackageName": r[1], "Version": r[2]})
        for r in pypi_rows:
            samples.append({"System": r[0], "PackageName": r[1], "Version": r[2]})

        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["System", "PackageName", "Version"])
            writer.writeheader()
            writer.writerows(samples)

        return samples
    finally:
        con.close()


def query_deps_dev_dependencies(
    system: str,
    package_name: str,
    version: str,
    timeout: float = 10.0,
    max_retries: int = 2,
    base_url: str = DEPS_DEV_API_BASE,
) -> Dict[str, Any]:
    """Query deps.dev dependencies endpoint for a single package version.

    Parameters
    ----------
    system : 'MAVEN' or 'PYPI'
    package_name : Package coordinate / name
    version : Release version string
    timeout : HTTP request timeout in seconds
    max_retries : Maximum retries on network / 5xx errors
    base_url : Base URL for deps.dev API

    Returns
    -------
    Dict[str, Any]
        Parsed response including status, elapsed time, nodes, and edges.
    """
    sys_lower = system.lower()
    pkg_encoded = urllib.parse.quote(package_name, safe="")
    ver_encoded = urllib.parse.quote(version, safe="")
    url = f"{base_url}/{sys_lower}/packages/{pkg_encoded}/versions/{ver_encoded}:dependencies"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "application/json",
        },
    )

    t0 = time.time()
    last_error = ""
    status_code = 0

    for attempt in range(max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                status_code = response.getcode()
                raw_body = response.read().decode("utf-8")
                elapsed_ms = round((time.time() - t0) * 1000, 2)
                data = json.loads(raw_body) if raw_body else {}

                nodes = data.get("nodes", [])
                edges = data.get("edges", [])

                return {
                    "System": system,
                    "PackageName": package_name,
                    "Version": version,
                    "StatusCode": status_code,
                    "ErrorMessage": "",
                    "ResponseTimeMs": elapsed_ms,
                    "TotalNodeCount": len(nodes),
                    "DirectDependencyCount": sum(
                        1 for n in nodes if n.get("relation") == "DIRECT"
                    ),
                    "EdgeCount": len(edges),
                    "RawNodes": nodes,
                    "RawEdges": edges,
                }
        except urllib.error.HTTPError as e:
            status_code = e.code
            elapsed_ms = round((time.time() - t0) * 1000, 2)
            last_error = f"HTTP {e.code}: {e.reason}"
            # Do not retry on 404 (package version not in deps.dev)
            if status_code == 404:
                break
            time.sleep(0.5 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError) as e:
            status_code = 0
            elapsed_ms = round((time.time() - t0) * 1000, 2)
            last_error = str(e)
            time.sleep(0.5 * (attempt + 1))
        except Exception as e:
            status_code = 0
            elapsed_ms = round((time.time() - t0) * 1000, 2)
            last_error = f"Unexpected error: {e}"
            break

    return {
        "System": system,
        "PackageName": package_name,
        "Version": version,
        "StatusCode": status_code,
        "ErrorMessage": last_error,
        "ResponseTimeMs": round((time.time() - t0) * 1000, 2),
        "TotalNodeCount": 0,
        "DirectDependencyCount": 0,
        "EdgeCount": 0,
        "RawNodes": [],
        "RawEdges": [],
    }


def parse_dependency_edges(
    system: str,
    package_name: str,
    version: str,
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
) -> List[Dict[str, str]]:
    """Convert deps.dev node-indexed edges into structured graph edge records."""
    structured_edges = []
    node_count = len(nodes)

    for edge in edges:
        from_idx = edge.get("fromNode")
        to_idx = edge.get("toNode")
        req = edge.get("requirement", "")

        if from_idx is None or to_idx is None:
            continue
        if from_idx >= node_count or to_idx >= node_count:
            continue

        from_node = nodes[from_idx]
        to_node = nodes[to_idx]

        from_vk = from_node.get("versionKey", {})
        to_vk = to_node.get("versionKey", {})

        src_sys = from_vk.get("system", system)
        src_pkg = from_vk.get("name", package_name)
        src_ver = from_vk.get("version", version)

        tgt_sys = to_vk.get("system", system)
        tgt_pkg = to_vk.get("name", "")
        tgt_ver = to_vk.get("version", "")
        relation = to_node.get("relation", "")

        structured_edges.append({
            "SourceSystem": src_sys,
            "SourcePackage": src_pkg,
            "SourceVersion": src_ver,
            "TargetSystem": tgt_sys,
            "TargetPackage": tgt_pkg,
            "TargetVersion": tgt_ver,
            "Requirement": req,
            "Relation": relation,
        })

    return structured_edges


def run_deps_dev_pilot(
    maven_csv: str | Path = "data/maven_20k.csv",
    pypi_csv: str | Path = "data/pypi.csv",
    sample_csv: str | Path = "data/processed/dependency_graph/package_version_sample.csv",
    status_csv: str | Path = "data/processed/dependency_graph/api_request_status.csv",
    edges_csv: str | Path = "data/processed/dependency_graph/dependency_edges.csv",
    maven_count: int = 10,
    pypi_count: int = 10,
    timeout: float = 10.0,
    max_retries: int = 2,
    base_url: str = DEPS_DEV_API_BASE,
) -> Dict[str, Any]:
    """Execute complete pilot: select 20 pairs, query deps.dev, and write output CSVs."""
    start_time = time.time()
    sample_path = Path(sample_csv).resolve()
    status_path = Path(status_csv).resolve()
    edges_path = Path(edges_csv).resolve()

    status_path.parent.mkdir(parents=True, exist_ok=True)
    edges_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Select sample
    print(f"Selecting {maven_count} Maven and {pypi_count} PyPI package-version pairs...")
    sample = select_package_version_sample(
        maven_csv=maven_csv,
        pypi_csv=pypi_csv,
        output_sample_csv=sample_path,
        maven_limit=maven_count,
        pypi_limit=pypi_count,
    )
    print(f"Sample saved to {sample_path} ({len(sample)} records).")

    # 2. Query deps.dev API
    print(f"Querying deps.dev for {len(sample)} package versions...")
    request_statuses = []
    all_edges = []

    successful_requests = 0
    failed_requests = 0

    for idx, item in enumerate(sample, 1):
        sys_name = item["System"]
        pkg_name = item["PackageName"]
        ver = item["Version"]

        print(f"  [{idx:02d}/{len(sample):02d}] Querying {sys_name}: {pkg_name}@{ver}...")
        res = query_deps_dev_dependencies(
            system=sys_name,
            package_name=pkg_name,
            version=ver,
            timeout=timeout,
            max_retries=max_retries,
            base_url=base_url,
        )

        code = res["StatusCode"]
        if code == 200:
            successful_requests += 1
            print(f"       -> Status 200 OK | Dependencies: {res['TotalNodeCount']} nodes, {res['EdgeCount']} edges ({res['ResponseTimeMs']} ms)")
        else:
            failed_requests += 1
            print(f"       -> Status {code} | Error: {res['ErrorMessage']} ({res['ResponseTimeMs']} ms)")

        # Record status
        request_statuses.append({
            "System": sys_name,
            "PackageName": pkg_name,
            "Version": ver,
            "StatusCode": code,
            "ErrorMessage": res["ErrorMessage"],
            "ResponseTimeMs": res["ResponseTimeMs"],
            "DirectDependencyCount": res["DirectDependencyCount"],
            "TotalNodeCount": res["TotalNodeCount"],
            "EdgeCount": res["EdgeCount"],
        })

        # Extract edges
        edges = parse_dependency_edges(
            system=sys_name,
            package_name=pkg_name,
            version=ver,
            nodes=res["RawNodes"],
            edges=res["RawEdges"],
        )
        all_edges.extend(edges)

        # Brief rate-limiting pause between calls (100ms)
        time.sleep(0.1)

    # 3. Save request statuses CSV
    status_fields = [
        "System", "PackageName", "Version", "StatusCode",
        "ErrorMessage", "ResponseTimeMs", "DirectDependencyCount",
        "TotalNodeCount", "EdgeCount"
    ]
    with open(status_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=status_fields)
        writer.writeheader()
        writer.writerows(request_statuses)

    # 4. Save dependency edges CSV
    edge_fields = [
        "SourceSystem", "SourcePackage", "SourceVersion",
        "TargetSystem", "TargetPackage", "TargetVersion",
        "Requirement", "Relation"
    ]
    with open(edges_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=edge_fields)
        writer.writeheader()
        writer.writerows(all_edges)

    elapsed_sec = round(time.time() - start_time, 2)
    print(f"\nPilot run finished in {elapsed_sec} seconds.")

    return {
        "elapsed_time_seconds": elapsed_sec,
        "sample_count": len(sample),
        "successful_requests": successful_requests,
        "failed_requests": failed_requests,
        "dependency_edges_found": len(all_edges),
        "paths": {
            "sample_csv": str(sample_path),
            "status_csv": str(status_path),
            "edges_csv": str(edges_path),
        },
    }


def main() -> None:
    """CLI entrypoint."""
    parser = argparse.ArgumentParser(description="Pilot deps.dev dependency query for 20 sample package versions.")
    parser.add_argument("--maven", default="data/maven_20k.csv", help="Path to maven_20k.csv")
    parser.add_argument("--pypi", default="data/pypi.csv", help="Path to pypi.csv")
    parser.add_argument(
        "--sample-out",
        default="data/processed/dependency_graph/package_version_sample.csv",
        help="Path to output sample CSV",
    )
    parser.add_argument(
        "--status-out",
        default="data/processed/dependency_graph/api_request_status.csv",
        help="Path to output request status CSV",
    )
    parser.add_argument(
        "--edges-out",
        default="data/processed/dependency_graph/dependency_edges.csv",
        help="Path to output dependency edges CSV",
    )
    parser.add_argument("--timeout", type=float, default=10.0, help="Request timeout in seconds")
    parser.add_argument("--retries", type=int, default=2, help="Max retries per request")
    args = parser.parse_args()

    results = run_deps_dev_pilot(
        maven_csv=args.maven,
        pypi_csv=args.pypi,
        sample_csv=args.sample_out,
        status_csv=args.status_out,
        edges_csv=args.edges_out,
        maven_count=10,
        pypi_count=10,
        timeout=args.timeout,
        max_retries=args.retries,
    )

    print("\n=== PILOT SUMMARY ===")
    print(f"Elapsed Time: {results['elapsed_time_seconds']}s")
    print(f"Successful Requests: {results['successful_requests']} / {results['sample_count']}")
    print(f"Failed Requests: {results['failed_requests']} / {results['sample_count']}")
    print(f"Dependency Edges Found: {results['dependency_edges_found']}")
    print(f"Sample Path:  {results['paths']['sample_csv']}")
    print(f"Status Path:  {results['paths']['status_csv']}")
    print(f"Edges Path:   {results['paths']['edges_csv']}")


if __name__ == "__main__":
    main()
