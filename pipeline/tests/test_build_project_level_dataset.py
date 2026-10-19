"""Tests for build_project_level_dataset pipeline using synthetic fixtures."""

from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest

from src.data_processing.build_project_level_dataset import (
    EXPECTED_PROJECT_COLUMNS,
    build_project_level_dataset,
)


@pytest.fixture
def synthetic_fixtures(tmp_path: Path):
    """Create tiny synthetic fixtures for testing project-level aggregation."""
    # 1. Projects fixture
    # - corp/polyglot: GITHUB repo containing BOTH Maven and PyPI packages
    # - corp/monorepo: GITHUB repo containing 3 Maven modules
    # - corp/py-single: GITHUB repo containing 1 PyPI package (with ForksCount = -1)
    projects_file = tmp_path / "projects.csv"
    projects_rows = [
        [
            "SnapshotAt",
            "Type",
            "Name",
            "OpenIssuesCount",
            "StarsCount",
            "ForksCount",
            "Licenses",
            "Description",
            "Homepage",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "GITHUB",
            "corp/polyglot",
            "10",
            "500",
            "50",
            "Apache-2.0",
            "Polyglot project publishing Maven and PyPI",
            "https://github.com/corp/polyglot",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "GITHUB",
            "corp/monorepo",
            "25",
            "1200",
            "120",
            "MIT",
            "Maven monorepo with multiple modules",
            "https://github.com/corp/monorepo",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "GITHUB",
            "corp/py-single",
            "2",
            "30",
            "-1",  # Should be converted to NULL
            "BSD-3-Clause",
            "PyPI single project with negative fork count",
            "https://github.com/corp/py-single",
        ],
    ]
    with open(projects_file, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(projects_rows)

    # 2. Maven fixture
    # - corp/monorepo has 3 packages: mod-a (v1.0.0), mod-b (v1.0.0), mod-c (v2.0.0)
    # - corp/polyglot has 1 package: polyglot-java (v0.5.0)
    # - corp/orphan-mvn has 1 package mapping to an unmatched project
    maven_file = tmp_path / "maven.csv"
    maven_rows = [
        [
            "SnapshotAt",
            "System",
            "Name",
            "Version",
            "ProjectType",
            "ProjectName",
            "RelationProvenance",
            "RelationType",
        ],
        ["2026-09-21 21:00:59.824814 UTC", "MAVEN", "org.corp:mod-a", "1.0.0", "GITHUB", "corp/monorepo", "UNVERIFIED_METADATA", "SOURCE_REPO_TYPE"],
        ["2026-09-21 21:00:59.824814 UTC", "MAVEN", "org.corp:mod-b", "1.0.0", "GITHUB", "corp/monorepo", "UNVERIFIED_METADATA", "SOURCE_REPO_TYPE"],
        ["2026-09-21 21:00:59.824814 UTC", "MAVEN", "org.corp:mod-c", "2.0.0", "GITHUB", "corp/monorepo", "UNVERIFIED_METADATA", "ISSUE_TRACKER_TYPE"],
        ["2026-09-21 21:00:59.824814 UTC", "MAVEN", "org.corp:polyglot-java", "0.5.0", "GITHUB", "corp/polyglot", "UNVERIFIED_METADATA", "SOURCE_REPO_TYPE"],
        ["2026-09-21 21:00:59.824814 UTC", "MAVEN", "org.corp:orphan-pkg", "0.1.0", "BITBUCKET", "corp/missing-repo", "UNVERIFIED_METADATA", "SOURCE_REPO_TYPE"],
    ]
    with open(maven_file, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(maven_rows)

    # 3. PyPI fixture
    # - corp/polyglot has 2 packages: polyglot-py (v0.5.0) and polyglot-core (v0.5.0)
    # - corp/py-single has 1 package: py-single-pkg (v1.2.3)
    pypi_file = tmp_path / "pypi.csv"
    pypi_rows = [
        [
            "SnapshotAt",
            "System",
            "Name",
            "Version",
            "ProjectType",
            "ProjectName",
            "RelationProvenance",
            "RelationType",
        ],
        ["2026-09-21 21:00:59.824814 UTC", "PYPI", "polyglot-py", "0.5.0", "GITHUB", "corp/polyglot", "PYPI_PUBLISH_ATTESTATION", "SOURCE_REPO_TYPE"],
        ["2026-09-21 21:00:59.824814 UTC", "PYPI", "polyglot-core", "0.5.0", "GITHUB", "corp/polyglot", "UNVERIFIED_METADATA", "SOURCE_REPO_TYPE"],
        ["2026-09-21 21:00:59.824814 UTC", "PYPI", "py-single-pkg", "1.2.3", "GITHUB", "corp/py-single", "UNVERIFIED_METADATA", "SOURCE_REPO_TYPE"],
    ]
    with open(pypi_file, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(pypi_rows)

    output_file = tmp_path / "project_level.csv"
    report_file = tmp_path / "report.md"

    return {
        "projects": projects_file,
        "maven": maven_file,
        "pypi": pypi_file,
        "output": output_file,
        "report": report_file,
    }


def test_aggregation_and_uniqueness(synthetic_fixtures):
    """Test that projects with multiple packages produce exactly ONE row per unique key."""
    metrics = build_project_level_dataset(
        projects_csv=synthetic_fixtures["projects"],
        maven_csv=synthetic_fixtures["maven"],
        pypi_csv=synthetic_fixtures["pypi"],
        source_mapping_csv=None,  # Force raw join mode
        output_csv=synthetic_fixtures["output"],
        report_md=synthetic_fixtures["report"],
    )

    out_file = synthetic_fixtures["output"]
    with open(out_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # 3 Maven projects + 2 PyPI projects = 5 total project rows
    assert len(rows) == 5
    assert metrics["total_project_rows"] == 5

    # Check uniqueness of (System, ProjectType, ProjectName)
    keys = [(r["System"], r["ProjectType"], r["ProjectName"]) for r in rows]
    assert len(keys) == len(set(keys)), "Composite key (System, ProjectType, ProjectName) must be unique"

    # Verify monorepo row: corp/monorepo has 3 package relations
    mono_row = next(r for r in rows if r["ProjectName"] == "corp/monorepo")
    assert mono_row["PackageCount"] == "3"
    assert mono_row["RelationshipCount"] == "3"
    assert mono_row["StarsCount"] == "1200"


def test_json_validity_and_recoverability(synthetic_fixtures):
    """Test that Packages column contains valid, well-escaped JSON recoverable with json.loads."""
    build_project_level_dataset(
        projects_csv=synthetic_fixtures["projects"],
        maven_csv=synthetic_fixtures["maven"],
        pypi_csv=synthetic_fixtures["pypi"],
        source_mapping_csv=None,
        output_csv=synthetic_fixtures["output"],
    )

    with open(synthetic_fixtures["output"], "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for r in rows:
        raw_json = r["Packages"]
        assert raw_json.startswith("[") and raw_json.endswith("]"), "Must be a JSON array string"
        parsed = json.loads(raw_json)
        assert isinstance(parsed, list)
        assert len(parsed) == int(r["RelationshipCount"])

        for item in parsed:
            assert "Name" in item
            assert "Version" in item
            assert "RelationType" in item
            assert "RelationProvenance" in item


def test_package_preservation(synthetic_fixtures):
    """Test that all 8 input relationships (5 Maven + 3 PyPI) are 100% preserved."""
    metrics = build_project_level_dataset(
        projects_csv=synthetic_fixtures["projects"],
        maven_csv=synthetic_fixtures["maven"],
        pypi_csv=synthetic_fixtures["pypi"],
        source_mapping_csv=None,
        output_csv=synthetic_fixtures["output"],
    )

    assert metrics["relations"]["total_source_relations"] == 8

    with open(synthetic_fixtures["output"], "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    all_preserved_items = []
    for r in rows:
        items = json.loads(r["Packages"])
        all_preserved_items.extend(items)

    assert len(all_preserved_items) == 8

    # Verify specific items
    mod_c = next(i for i in all_preserved_items if i["Name"] == "org.corp:mod-c")
    assert mod_c["Version"] == "2.0.0"
    assert mod_c["RelationType"] == "ISSUE_TRACKER_TYPE"


def test_maven_pypi_separation(synthetic_fixtures):
    """Test that polyglot repository corp/polyglot creates 2 distinct rows (MAVEN and PYPI)."""
    build_project_level_dataset(
        projects_csv=synthetic_fixtures["projects"],
        maven_csv=synthetic_fixtures["maven"],
        pypi_csv=synthetic_fixtures["pypi"],
        source_mapping_csv=None,
        output_csv=synthetic_fixtures["output"],
    )

    with open(synthetic_fixtures["output"], "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    polyglot_rows = [r for r in rows if r["ProjectName"] == "corp/polyglot"]
    assert len(polyglot_rows) == 2, "corp/polyglot must produce 2 distinct rows"

    systems = {r["System"] for r in polyglot_rows}
    assert systems == {"MAVEN", "PYPI"}, "Both systems must be distinctly preserved without merging"

    mvn_poly = next(r for r in polyglot_rows if r["System"] == "MAVEN")
    pypi_poly = next(r for r in polyglot_rows if r["System"] == "PYPI")

    assert mvn_poly["PackageCount"] == "1"
    assert pypi_poly["PackageCount"] == "2"


def test_unmatched_references_and_metadata(synthetic_fixtures):
    """Test that unmatched projects are preserved with UNMATCHED status and ForksCount=-1 converted."""
    build_project_level_dataset(
        projects_csv=synthetic_fixtures["projects"],
        maven_csv=synthetic_fixtures["maven"],
        pypi_csv=synthetic_fixtures["pypi"],
        source_mapping_csv=None,
        output_csv=synthetic_fixtures["output"],
    )

    with open(synthetic_fixtures["output"], "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Check unmatched project
    unmatched_row = next(r for r in rows if r["ProjectName"] == "corp/missing-repo")
    assert unmatched_row["ProjectMatchStatus"] == "UNMATCHED"
    assert unmatched_row["StarsCount"] == ""
    assert unmatched_row["ForksCount"] == ""
    assert unmatched_row["PackageCount"] == "1"
    parsed = json.loads(unmatched_row["Packages"])
    assert parsed[0]["Name"] == "org.corp:orphan-pkg"

    # Check ForksCount sentinel conversion
    py_single_row = next(r for r in rows if r["ProjectName"] == "corp/py-single")
    assert py_single_row["ProjectMatchStatus"] == "MATCHED"
    assert py_single_row["StarsCount"] == "30"
    assert py_single_row["ForksCount"] == "", "ForksCount = -1 must be converted to empty/NULL"
