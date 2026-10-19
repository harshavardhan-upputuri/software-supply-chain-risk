"""Tests for build_project_package_mapping pipeline using synthetic fixtures."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import List

import pytest

from src.data_processing.build_project_package_mapping import (
    EXPECTED_OUTPUT_COLUMNS,
    run_mapping_pipeline,
)


@pytest.fixture
def synthetic_data(tmp_path: Path):
    """Create tiny synthetic fixtures for testing the mapping pipeline."""
    # 1. Projects fixture
    # Includes:
    # - A GitHub repo
    # - A GitLab repo with the exact same name to test compound key disambiguation
    # - A repo with ForksCount = -1 to test conversion to NULL
    # - A repo with normal metrics
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
            "corp/shared-lib",
            "12",
            "500",
            "45",
            "MIT",
            "GitHub corporate shared lib",
            "https://github.com/corp/shared-lib",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "GITLAB",
            "corp/shared-lib",
            "3",
            "25",
            "-1",  # Should be converted to NULL in output
            "Apache-2.0",
            "GitLab fork with negative forks sentinel",
            "https://gitlab.com/corp/shared-lib",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "GITHUB",
            "corp/maven-only",
            "0",
            "100",
            "10",
            "BSD-3-Clause",
            "Maven specific project",
            "https://github.com/corp/maven-only",
        ],
    ]
    with open(projects_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(projects_rows)

    # 2. Maven package relations fixture
    # Includes:
    # - Row matched to GITHUB corp/shared-lib
    # - Same package/version with different RelationType (must be preserved!)
    # - Row matched to GITHUB corp/maven-only
    # - Row mapping to non-existent repo (must be preserved as UNMATCHED)
    # - An exact duplicate row (must be removed by exact duplicate deduplication)
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
        [
            "2026-09-21 21:00:59.824814 UTC",
            "MAVEN",
            "com.corp:shared-lib",
            "1.0.0",
            "GITHUB",
            "corp/shared-lib",
            "UNVERIFIED_METADATA",
            "SOURCE_REPO_TYPE",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "MAVEN",
            "com.corp:shared-lib",
            "1.0.0",
            "GITHUB",
            "corp/shared-lib",
            "UNVERIFIED_METADATA",
            "ISSUE_TRACKER_TYPE",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "MAVEN",
            "com.corp:maven-tool",
            "63",  # Non-semver string preserved
            "GITHUB",
            "corp/maven-only",
            "UNVERIFIED_METADATA",
            "SOURCE_REPO_TYPE",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "MAVEN",
            "com.corp:orphan-lib",
            "0.0.1-SNAPSHOT",
            "BITBUCKET",
            "corp/missing-repo",
            "UNVERIFIED_METADATA",
            "SOURCE_REPO_TYPE",
        ],
        # Duplicate row to test exact duplicate deduplication:
        [
            "2026-09-21 21:00:59.824814 UTC",
            "MAVEN",
            "com.corp:orphan-lib",
            "0.0.1-SNAPSHOT",
            "BITBUCKET",
            "corp/missing-repo",
            "UNVERIFIED_METADATA",
            "SOURCE_REPO_TYPE",
        ],
    ]
    with open(maven_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(maven_rows)

    # 3. PyPI package relations fixture
    # Includes:
    # - Row matched to GITLAB corp/shared-lib (same repo name, different Type!)
    # - Row matched to GITHUB corp/shared-lib
    # - Row with PyPI publish attestation
    # - Row unmatched to projects
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
        [
            "2026-09-21 21:00:59.824814 UTC",
            "PYPI",
            "corp-shared",
            "2.5.0",
            "GITLAB",
            "corp/shared-lib",
            "PYPI_PUBLISH_ATTESTATION",
            "SOURCE_REPO_TYPE",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "PYPI",
            "corp-shared",
            "2.5.0",
            "GITHUB",
            "corp/shared-lib",
            "UNVERIFIED_METADATA",
            "SOURCE_REPO_TYPE",
        ],
        [
            "2026-09-21 21:00:59.824814 UTC",
            "PYPI",
            "orphan-pkg",
            "1.16.31.1",
            "GITHUB",
            "ghost/unknown-project",
            "UNVERIFIED_METADATA",
            "SOURCE_REPO_TYPE",
        ],
    ]
    with open(pypi_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(pypi_rows)

    output_file = tmp_path / "output.csv"

    return {
        "projects_file": projects_file,
        "maven_file": maven_file,
        "pypi_file": pypi_file,
        "output_file": output_file,
    }


def test_pipeline_execution_and_schema(synthetic_data):
    """Test that pipeline executes cleanly and produces exact expected columns in order."""
    results = run_mapping_pipeline(
        projects_csv=synthetic_data["projects_file"],
        maven_csv=synthetic_data["maven_file"],
        pypi_csv=synthetic_data["pypi_file"],
        output_csv=synthetic_data["output_file"],
    )

    out_file = synthetic_data["output_file"]
    assert out_file.is_file(), "Output CSV should be generated"

    with open(out_file, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        assert header == EXPECTED_OUTPUT_COLUMNS, f"Header mismatch: {header} vs {EXPECTED_OUTPUT_COLUMNS}"


def test_exact_duplicate_removal_and_row_counts(synthetic_data):
    """Test that exact duplicates are removed and legitimate records are preserved."""
    results = run_mapping_pipeline(
        projects_csv=synthetic_data["projects_file"],
        maven_csv=synthetic_data["maven_file"],
        pypi_csv=synthetic_data["pypi_file"],
        output_csv=synthetic_data["output_file"],
    )

    # Input: 5 maven rows + 3 pypi rows = 8 total package rows
    # Maven had 1 exact duplicate, so 8 - 1 = 7 distinct output rows
    assert results["inputs"]["total_package_rows"] == 8
    assert results["output"]["exact_duplicates_removed"] == 1
    assert results["output"]["total_rows"] == 7
    assert results["maven"]["total_rows"] == 4
    assert results["pypi"]["total_rows"] == 3


def test_compound_key_disambiguation(synthetic_data):
    """Test that join strictly uses both ProjectType and ProjectName."""
    run_mapping_pipeline(
        projects_csv=synthetic_data["projects_file"],
        maven_csv=synthetic_data["maven_file"],
        pypi_csv=synthetic_data["pypi_file"],
        output_csv=synthetic_data["output_file"],
    )

    with open(synthetic_data["output_file"], "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Check the PyPI row that pointed to GITLAB corp/shared-lib
    gitlab_rows = [r for r in rows if r["ProjectType"] == "GITLAB" and r["ProjectName"] == "corp/shared-lib"]
    assert len(gitlab_rows) == 1
    gitlab_row = gitlab_rows[0]
    assert gitlab_row["ProjectMatchStatus"] == "MATCHED"
    assert gitlab_row["StarsCount"] == "25"  # GitLab project has 25 stars, not GitHub's 500
    assert gitlab_row["Licenses"] == "Apache-2.0"

    # Check GitHub corp/shared-lib rows
    github_rows = [r for r in rows if r["ProjectType"] == "GITHUB" and r["ProjectName"] == "corp/shared-lib"]
    assert len(github_rows) >= 2
    for r in github_rows:
        assert r["ProjectMatchStatus"] == "MATCHED"
        assert r["StarsCount"] == "500"  # GitHub project has 500 stars
        assert r["Licenses"] == "MIT"


def test_forks_count_sentinel_conversion(synthetic_data):
    """Test that ForksCount = -1 is converted to empty string/NULL in output."""
    results = run_mapping_pipeline(
        projects_csv=synthetic_data["projects_file"],
        maven_csv=synthetic_data["maven_file"],
        pypi_csv=synthetic_data["pypi_file"],
        output_csv=synthetic_data["output_file"],
    )

    assert results["output"]["negative_forks_count"] == 0

    with open(synthetic_data["output_file"], "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # The GitLab row had ForksCount = -1
    gitlab_row = next(r for r in rows if r["ProjectType"] == "GITLAB" and r["ProjectName"] == "corp/shared-lib")
    assert gitlab_row["ForksCount"] == "", "ForksCount -1 must be converted to empty/NULL"

    # The GitHub corp/shared-lib had ForksCount = 45, which should be preserved
    github_row = next(r for r in rows if r["ProjectType"] == "GITHUB" and r["ProjectName"] == "corp/shared-lib")
    assert github_row["ForksCount"] == "45"


def test_unmatched_record_preservation(synthetic_data):
    """Test that unmatched records are preserved with status UNMATCHED and null project fields."""
    run_mapping_pipeline(
        projects_csv=synthetic_data["projects_file"],
        maven_csv=synthetic_data["maven_file"],
        pypi_csv=synthetic_data["pypi_file"],
        output_csv=synthetic_data["output_file"],
    )

    with open(synthetic_data["output_file"], "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    unmatched_rows = [r for r in rows if r["ProjectMatchStatus"] == "UNMATCHED"]
    assert len(unmatched_rows) == 2  # 1 maven orphan + 1 pypi orphan

    for ur in unmatched_rows:
        assert ur["StarsCount"] == ""
        assert ur["ForksCount"] == ""
        assert ur["OpenIssuesCount"] == ""
        assert ur["Licenses"] == ""
        assert ur["Description"] == ""
        assert ur["Homepage"] == ""
        assert ur["PackageName"] != ""
        assert ur["Version"] != ""
        assert ur["ProjectType"] != ""
        assert ur["ProjectName"] != ""


def test_version_and_relation_preservation(synthetic_data):
    """Test that version strings and different relation types/provenances are preserved."""
    run_mapping_pipeline(
        projects_csv=synthetic_data["projects_file"],
        maven_csv=synthetic_data["maven_file"],
        pypi_csv=synthetic_data["pypi_file"],
        output_csv=synthetic_data["output_file"],
    )

    with open(synthetic_data["output_file"], "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Check non-semver version '63'
    v63 = next(r for r in rows if r["PackageName"] == "com.corp:maven-tool")
    assert v63["Version"] == "63"

    # Check relation type differences for com.corp:shared-lib (SOURCE_REPO_TYPE vs ISSUE_TRACKER_TYPE)
    shared_maven = [r for r in rows if r["PackageName"] == "com.corp:shared-lib"]
    rel_types = {r["RelationType"] for r in shared_maven}
    assert rel_types == {"SOURCE_REPO_TYPE", "ISSUE_TRACKER_TYPE"}
