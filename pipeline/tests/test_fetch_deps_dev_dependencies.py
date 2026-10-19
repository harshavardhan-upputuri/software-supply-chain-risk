"""Tests for fetch_deps_dev_dependencies using synthetic data and mocked API calls."""

from __future__ import annotations

import csv
import io
import json
import urllib.error
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.data_processing.fetch_deps_dev_dependencies import (
    parse_dependency_edges,
    query_deps_dev_dependencies,
    run_deps_dev_pilot,
    select_package_version_sample,
)


@pytest.fixture
def synthetic_raw_csvs(tmp_path: Path):
    """Create tiny synthetic maven and pypi CSVs for testing sample selection."""
    maven_file = tmp_path / "maven_sample.csv"
    pypi_file = tmp_path / "pypi_sample.csv"

    maven_rows = [
        ["SnapshotAt", "System", "Name", "Version", "ProjectType", "ProjectName", "RelationProvenance", "RelationType"],
    ]
    for i in range(1, 15):
        maven_rows.append([
            "2026-09-21 21:00:59 UTC", "MAVEN", f"org.test:pkg-{i}", f"1.{i}.0",
            "GITHUB", f"test/mvn-{i}", "UNVERIFIED_METADATA", "SOURCE_REPO_TYPE"
        ])

    pypi_rows = [
        ["SnapshotAt", "System", "Name", "Version", "ProjectType", "ProjectName", "RelationProvenance", "RelationType"],
    ]
    for i in range(1, 15):
        pypi_rows.append([
            "2026-09-21 21:00:59 UTC", "PYPI", f"pypi-pkg-{i}", f"2.{i}.0",
            "GITHUB", f"test/py-{i}", "UNVERIFIED_METADATA", "SOURCE_REPO_TYPE"
        ])

    with open(maven_file, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(maven_rows)
    with open(pypi_file, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(pypi_rows)

    return {"maven": maven_file, "pypi": pypi_file}


def test_select_package_version_sample(tmp_path: Path, synthetic_raw_csvs):
    """Test DuckDB sampling of package-version pairs."""
    out_csv = tmp_path / "sample.csv"
    samples = select_package_version_sample(
        maven_csv=synthetic_raw_csvs["maven"],
        pypi_csv=synthetic_raw_csvs["pypi"],
        output_sample_csv=out_csv,
        maven_limit=3,
        pypi_limit=3,
    )

    assert len(samples) == 6
    assert sum(1 for s in samples if s["System"] == "MAVEN") == 3
    assert sum(1 for s in samples if s["System"] == "PYPI") == 3
    assert out_csv.is_file()

    with open(out_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        assert len(rows) == 6
        assert list(rows[0].keys()) == ["System", "PackageName", "Version"]


def test_query_deps_dev_success_parsing():
    """Test parsing a successful 200 OK response from deps.dev."""
    mock_payload = {
        "nodes": [
            {"versionKey": {"system": "PYPI", "name": "requests", "version": "2.31.0"}, "bundled": False, "relation": "SELF"},
            {"versionKey": {"system": "PYPI", "name": "certifi", "version": "2023.7.22"}, "bundled": False, "relation": "DIRECT"},
            {"versionKey": {"system": "PYPI", "name": "urllib3", "version": "2.0.4"}, "bundled": False, "relation": "DIRECT"},
        ],
        "edges": [
            {"fromNode": 0, "toNode": 1, "requirement": ">=2017.4.17"},
            {"fromNode": 0, "toNode": 2, "requirement": "<3,>=1.21.1"},
        ]
    }

    mock_response = MagicMock()
    mock_response.getcode.return_value = 200
    mock_response.read.return_value = json.dumps(mock_payload).encode("utf-8")
    mock_response.__enter__.return_value = mock_response

    with patch("urllib.request.urlopen", return_value=mock_response):
        result = query_deps_dev_dependencies("PYPI", "requests", "2.31.0")

    assert result["StatusCode"] == 200
    assert result["ErrorMessage"] == ""
    assert result["TotalNodeCount"] == 3
    assert result["DirectDependencyCount"] == 2
    assert result["EdgeCount"] == 2

    # Verify edge extraction
    edges = parse_dependency_edges(
        "PYPI", "requests", "2.31.0",
        nodes=result["RawNodes"],
        edges=result["RawEdges"]
    )
    assert len(edges) == 2
    assert edges[0]["SourcePackage"] == "requests"
    assert edges[0]["TargetPackage"] == "certifi"
    assert edges[0]["Requirement"] == ">=2017.4.17"
    assert edges[0]["Relation"] == "DIRECT"


def test_query_deps_dev_404_not_found():
    """Test handling of 404 response without retries."""
    http_error = urllib.error.HTTPError(
        url="https://api.deps.dev/v3/...",
        code=404,
        msg="Not Found",
        hdrs=MagicMock(),
        fp=io.BytesIO(b'{"error": "version not found"}')
    )

    with patch("urllib.request.urlopen", side_effect=http_error) as mock_call:
        result = query_deps_dev_dependencies("MAVEN", "nonexistent:pkg", "0.0.1")

    assert result["StatusCode"] == 404
    assert "404" in result["ErrorMessage"]
    assert result["TotalNodeCount"] == 0
    assert result["EdgeCount"] == 0
    # 404 should terminate immediately without retries (called exactly once)
    assert mock_call.call_count == 1


def test_query_deps_dev_timeout_retry():
    """Test network timeout retry logic."""
    url_error = urllib.error.URLError("Connection timed out")

    with patch("urllib.request.urlopen", side_effect=url_error) as mock_call:
        result = query_deps_dev_dependencies("PYPI", "some-pkg", "1.0.0", max_retries=1)

    assert result["StatusCode"] == 0
    assert "timed out" in result["ErrorMessage"]
    # 1 initial attempt + 1 retry = 2 calls
    assert mock_call.call_count == 2


def test_full_pilot_pipeline_with_mocks(tmp_path: Path, synthetic_raw_csvs):
    """Test the complete pilot pipeline workflow with mocked HTTP calls."""
    sample_csv = tmp_path / "sample.csv"
    status_csv = tmp_path / "status.csv"
    edges_csv = tmp_path / "edges.csv"

    mock_payload = {
        "nodes": [
            {"versionKey": {"system": "MAVEN", "name": "root", "version": "1.0"}, "relation": "SELF"},
            {"versionKey": {"system": "MAVEN", "name": "dep-a", "version": "1.0"}, "relation": "DIRECT"},
        ],
        "edges": [{"fromNode": 0, "toNode": 1, "requirement": "1.0"}],
    }
    mock_resp = MagicMock()
    mock_resp.getcode.return_value = 200
    mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        res = run_deps_dev_pilot(
            maven_csv=synthetic_raw_csvs["maven"],
            pypi_csv=synthetic_raw_csvs["pypi"],
            sample_csv=sample_csv,
            status_csv=status_csv,
            edges_csv=edges_csv,
            maven_count=2,
            pypi_count=2,
            timeout=5.0,
            max_retries=1,
        )

    assert res["sample_count"] == 4
    assert res["successful_requests"] == 4
    assert res["failed_requests"] == 0
    assert res["dependency_edges_found"] == 4

    assert sample_csv.is_file()
    assert status_csv.is_file()
    assert edges_csv.is_file()

    # Check status file schema
    with open(status_csv, "r", encoding="utf-8") as f:
        status_rows = list(csv.DictReader(f))
        assert len(status_rows) == 4
        assert "StatusCode" in status_rows[0]
        assert "ResponseTimeMs" in status_rows[0]

    # Check edges file schema
    with open(edges_csv, "r", encoding="utf-8") as f:
        edge_rows = list(csv.DictReader(f))
        assert len(edge_rows) == 4
        assert "SourcePackage" in edge_rows[0]
        assert "TargetPackage" in edge_rows[0]
        assert "Requirement" in edge_rows[0]
