"""Build unified project-to-package mapping dataset combining Maven and PyPI.

This script executes a memory-efficient join using DuckDB, matching package
ecosystem relationships to upstream project metadata on:
    (pkg.ProjectType, pkg.ProjectName) = (prj.Type, prj.Name)

Raw files are never modified. Exact duplicate output rows are removed, while
all distinct package versions, relation types, and provenances are preserved.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

import duckdb


EXPECTED_OUTPUT_COLUMNS = [
    "SnapshotAt",
    "ProjectType",
    "ProjectName",
    "OpenIssuesCount",
    "StarsCount",
    "ForksCount",
    "Licenses",
    "Description",
    "Homepage",
    "System",
    "PackageName",
    "Version",
    "RelationProvenance",
    "RelationType",
    "ProjectMatchStatus",
]


def calculate_file_sha256(filepath: str | Path, block_size: int = 1024 * 1024) -> str:
    """Calculate SHA256 checksum of a file in streaming chunks."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(block_size):
            sha.update(chunk)
    return sha.hexdigest()


def run_mapping_pipeline(
    projects_csv: str | Path = "data/projects.csv",
    maven_csv: str | Path = "data/maven_20k.csv",
    pypi_csv: str | Path = "data/pypi.csv",
    output_csv: str | Path = "data/processed/project_package_mapping.csv",
    max_memory: str = "2GB",
    threads: int = 4,
    temp_dir: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """Execute the project-package mapping ETL pipeline and return validation statistics.

    Parameters
    ----------
    projects_csv : Path to raw projects CSV.
    maven_csv : Path to raw Maven package relations CSV.
    pypi_csv : Path to raw PyPI package relations CSV.
    output_csv : Path to output mapped CSV.
    max_memory : Memory limit for DuckDB query engine.
    threads : Number of execution threads for DuckDB.
    temp_dir : Optional temporary directory for DuckDB disk spilling.

    Returns
    -------
    Dict[str, Any]
        Comprehensive validation metrics and audit statistics.
    """
    start_time = time.time()
    projects_path = Path(projects_csv).resolve()
    maven_path = Path(maven_csv).resolve()
    pypi_path = Path(pypi_csv).resolve()
    out_path = Path(output_csv).resolve()

    if not projects_path.is_file():
        raise FileNotFoundError(f"Projects file not found: {projects_path}")
    if not maven_path.is_file():
        raise FileNotFoundError(f"Maven file not found: {maven_path}")
    if not pypi_path.is_file():
        raise FileNotFoundError(f"PyPI file not found: {pypi_path}")

    # Ensure output directory exists
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Initialize DuckDB
    con = duckdb.connect(":memory:")
    con.execute(f"SET max_memory = '{max_memory}'")
    con.execute("SET preserve_insertion_order = false")
    con.execute(f"PRAGMA threads = {threads}")
    if temp_dir:
        td = Path(temp_dir).resolve()
        td.mkdir(parents=True, exist_ok=True)
        con.execute(f"SET temp_directory = '{td.as_posix()}'")

    try:
        # 1. Inspect input counts
        print(f"Reading input datasets...")
        proj_count_res = con.execute(f"""
            SELECT count(*) FROM read_csv(
                '{projects_path.as_posix()}',
                header = true,
                quote = '"',
                escape = '"',
                max_line_size = 2000000
            )
        """).fetchone()
        projects_input_count = proj_count_res[0] if proj_count_res else 0

        maven_count_res = con.execute(f"""
            SELECT count(*) FROM read_csv(
                '{maven_path.as_posix()}',
                header = true,
                quote = '"',
                escape = '"',
                max_line_size = 2000000,
                types = {{'Version': 'VARCHAR', 'Name': 'VARCHAR'}}
            )
        """).fetchone()
        maven_input_count = maven_count_res[0] if maven_count_res else 0

        pypi_count_res = con.execute(f"""
            SELECT count(*) FROM read_csv(
                '{pypi_path.as_posix()}',
                header = true,
                quote = '"',
                escape = '"',
                max_line_size = 2000000,
                types = {{'Version': 'VARCHAR', 'Name': 'VARCHAR'}}
            )
        """).fetchone()
        pypi_input_count = pypi_count_res[0] if pypi_count_res else 0

        print(f"  projects.csv: {projects_input_count:,} rows")
        print(f"  maven.csv:    {maven_input_count:,} rows")
        print(f"  pypi.csv:     {pypi_input_count:,} rows")

        # 2. Build joined table
        # We unite Maven and PyPI package relations, then left-join projects.
        # ForksCount = -1 is converted to NULL.
        # Exact duplicate output rows are deduplicated with DISTINCT.
        print("Executing memory-efficient join and exact duplicate removal...")

        con.execute(f"""
            CREATE OR REPLACE TEMP TABLE raw_joined AS
            WITH projects AS (
                SELECT 
                    Type,
                    Name,
                    TRY_CAST(OpenIssuesCount AS BIGINT) AS OpenIssuesCount,
                    TRY_CAST(StarsCount AS BIGINT) AS StarsCount,
                    CASE 
                        WHEN TRY_CAST(ForksCount AS BIGINT) = -1 THEN NULL 
                        ELSE TRY_CAST(ForksCount AS BIGINT) 
                    END AS ForksCount,
                    Licenses,
                    Description,
                    Homepage
                FROM read_csv(
                    '{projects_path.as_posix()}',
                    header = true,
                    quote = '"',
                    escape = '"',
                    max_line_size = 2000000
                )
            ),
            all_packages AS (
                SELECT 
                    SnapshotAt,
                    'MAVEN' AS System,
                    Name AS PackageName,
                    Version,
                    ProjectType,
                    ProjectName,
                    RelationProvenance,
                    RelationType
                FROM read_csv(
                    '{maven_path.as_posix()}',
                    header = true,
                    quote = '"',
                    escape = '"',
                    max_line_size = 2000000,
                    types = {{'Version': 'VARCHAR', 'Name': 'VARCHAR'}}
                )
                UNION ALL
                SELECT 
                    SnapshotAt,
                    'PYPI' AS System,
                    Name AS PackageName,
                    Version,
                    ProjectType,
                    ProjectName,
                    RelationProvenance,
                    RelationType
                FROM read_csv(
                    '{pypi_path.as_posix()}',
                    header = true,
                    quote = '"',
                    escape = '"',
                    max_line_size = 2000000,
                    types = {{'Version': 'VARCHAR', 'Name': 'VARCHAR'}}
                )
            )
            SELECT 
                pkg.SnapshotAt,
                pkg.ProjectType,
                pkg.ProjectName,
                prj.OpenIssuesCount,
                prj.StarsCount,
                prj.ForksCount,
                prj.Licenses,
                prj.Description,
                prj.Homepage,
                pkg.System,
                pkg.PackageName,
                pkg.Version,
                pkg.RelationProvenance,
                pkg.RelationType,
                CASE 
                    WHEN prj.Type IS NOT NULL AND prj.Name IS NOT NULL THEN 'MATCHED'
                    ELSE 'UNMATCHED'
                END AS ProjectMatchStatus
            FROM all_packages pkg
            LEFT JOIN projects prj
                ON pkg.ProjectType = prj.Type
               AND pkg.ProjectName = prj.Name;
        """)

        total_before_dedup = con.execute("SELECT count(*) FROM raw_joined").fetchone()[0]

        # Materialize distinct rows into final output table
        con.execute("""
            CREATE OR REPLACE TEMP TABLE final_output AS
            SELECT DISTINCT * FROM raw_joined;
        """)

        total_output_count = con.execute("SELECT count(*) FROM final_output").fetchone()[0]
        exact_duplicates_removed = total_before_dedup - total_output_count

        # 3. Stream to CSV output
        print(f"Exporting combined mapped dataset to {out_path}...")
        con.execute(f"""
            COPY final_output TO '{out_path.as_posix()}' (HEADER, DELIMITER ',');
        """)

        # 4. Gather comprehensive validation metrics
        print("Gathering validation metrics...")

        # Maven breakdown
        maven_metrics = con.execute("""
            SELECT 
                count(*) AS total,
                count(*) FILTER (WHERE ProjectMatchStatus = 'MATCHED') AS matched,
                count(*) FILTER (WHERE ProjectMatchStatus = 'UNMATCHED') AS unmatched,
                count(DISTINCT (ProjectType, ProjectName)) AS distinct_projects,
                count(DISTINCT PackageName) AS distinct_packages,
                count(DISTINCT (PackageName, Version)) AS distinct_versions
            FROM final_output
            WHERE System = 'MAVEN'
        """).fetchone()

        # PyPI breakdown
        pypi_metrics = con.execute("""
            SELECT 
                count(*) AS total,
                count(*) FILTER (WHERE ProjectMatchStatus = 'MATCHED') AS matched,
                count(*) FILTER (WHERE ProjectMatchStatus = 'UNMATCHED') AS unmatched,
                count(DISTINCT (ProjectType, ProjectName)) AS distinct_projects,
                count(DISTINCT PackageName) AS distinct_packages,
                count(DISTINCT (PackageName, Version)) AS distinct_versions
            FROM final_output
            WHERE System = 'PYPI'
        """).fetchone()

        # Total distinct project keys across entire output
        total_distinct_projects = con.execute("""
            SELECT count(DISTINCT (ProjectType, ProjectName)) FROM final_output
        """).fetchone()[0]

        # Validation: Verify that every matched record has valid composite project key and non-null status
        invalid_matched_count = con.execute("""
            SELECT count(*) FROM final_output
            WHERE ProjectMatchStatus = 'MATCHED'
              AND (ProjectType IS NULL OR ProjectName IS NULL)
        """).fetchone()[0]

        # Check negative forks
        negative_forks_in_output = con.execute("""
            SELECT count(*) FROM final_output WHERE ForksCount < 0
        """).fetchone()[0]

        elapsed_sec = time.time() - start_time
        print(f"Mapping pipeline completed successfully in {elapsed_sec:.2f} seconds.")

        return {
            "inputs": {
                "projects_count": projects_input_count,
                "maven_count": maven_input_count,
                "pypi_count": pypi_input_count,
                "total_package_rows": maven_input_count + pypi_input_count,
            },
            "output": {
                "total_rows": total_output_count,
                "exact_duplicates_removed": exact_duplicates_removed,
                "total_distinct_project_keys": total_distinct_projects,
                "negative_forks_count": negative_forks_in_output,
                "invalid_matched_records": invalid_matched_count,
                "output_file": str(out_path),
                "output_file_size_bytes": os.path.getsize(out_path),
            },
            "maven": {
                "total_rows": maven_metrics[0],
                "matched_rows": maven_metrics[1],
                "matched_pct": (maven_metrics[1] / maven_metrics[0] * 100) if maven_metrics[0] else 0.0,
                "unmatched_rows": maven_metrics[2],
                "unmatched_pct": (maven_metrics[2] / maven_metrics[0] * 100) if maven_metrics[0] else 0.0,
                "distinct_projects": maven_metrics[3],
                "distinct_packages": maven_metrics[4],
                "distinct_package_versions": maven_metrics[5],
            },
            "pypi": {
                "total_rows": pypi_metrics[0],
                "matched_rows": pypi_metrics[1],
                "matched_pct": (pypi_metrics[1] / pypi_metrics[0] * 100) if pypi_metrics[0] else 0.0,
                "unmatched_rows": pypi_metrics[2],
                "unmatched_pct": (pypi_metrics[2] / pypi_metrics[0] * 100) if pypi_metrics[0] else 0.0,
                "distinct_projects": pypi_metrics[3],
                "distinct_packages": pypi_metrics[4],
                "distinct_package_versions": pypi_metrics[5],
            },
            "execution_time_seconds": elapsed_sec,
        }
    finally:
        con.close()


def main() -> None:
    """CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Build project_package_mapping dataset combining Maven and PyPI."
    )
    parser.add_argument("--projects", default="data/projects.csv", help="Path to projects.csv")
    parser.add_argument("--maven", default="data/maven_20k.csv", help="Path to maven_20k.csv")
    parser.add_argument("--pypi", default="data/pypi.csv", help="Path to pypi.csv")
    parser.add_argument(
        "--output",
        default="data/processed/project_package_mapping.csv",
        help="Path to output mapping CSV",
    )
    parser.add_argument("--max-memory", default="2GB", help="DuckDB max memory limit")
    parser.add_argument("--threads", type=int, default=4, help="DuckDB execution threads")
    args = parser.parse_args()

    results = run_mapping_pipeline(
        projects_csv=args.projects,
        maven_csv=args.maven,
        pypi_csv=args.pypi,
        output_csv=args.output,
        max_memory=args.max_memory,
        threads=args.threads,
    )

    print("\n=== PIPELINE RUN SUMMARY ===")
    print(f"Total Output Rows: {results['output']['total_rows']:,}")
    print(f"Exact Duplicates Removed: {results['output']['exact_duplicates_removed']:,}")
    print(f"Maven Rows:  {results['maven']['total_rows']:,} (Matched: {results['maven']['matched_rows']:,} / {results['maven']['matched_pct']:.2f}%)")
    print(f"PyPI Rows:   {results['pypi']['total_rows']:,} (Matched: {results['pypi']['matched_rows']:,} / {results['pypi']['matched_pct']:.2f}%)")
    print(f"Total Distinct Projects: {results['output']['total_distinct_project_keys']:,}")
    print(f"Output File: {results['output']['output_file']} ({results['output']['output_file_size_bytes'] / (1024*1024):.2f} MB)")


if __name__ == "__main__":
    main()
