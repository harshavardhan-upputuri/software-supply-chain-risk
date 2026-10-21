"""Tests for project import-next endpoint and ProjectImporterService."""

import os
import sys
import csv
import json
from pathlib import Path

# Ensure backend and root are on sys.path and Django is configured
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
from apps.dependency_graph.models import Project, ProjectPackage, ProjectGraph
from apps.dependency_graph.services.project_importer import ProjectImporterService


class TestProjectImporter:
    """Test suite for ProjectImporterService and import-next API."""

    def setup_method(self):
        """Prepare temporary test fixtures and clean up DB."""
        Project.objects.filter(project_name__startswith="testcorp/").delete()

        self.tmp_dir = Path(__file__).resolve().parent / "_test_data"
        self.tmp_dir.mkdir(exist_ok=True)
        self.csv_file = self.tmp_dir / "test_projects.csv"
        self.checkpoint_file = self.tmp_dir / ".import_checkpoint.json"

        # Write clean synthetic CSV using csv.writer
        with open(self.csv_file, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "System", "ProjectType", "ProjectName", "ProjectMatchStatus",
                "OpenIssuesCount", "StarsCount", "ForksCount", "Licenses",
                "Description", "Homepage", "PackageCount", "VersionCount",
                "RelationshipCount", "Packages"
            ])
            # Row 1: Valid MAVEN project
            writer.writerow([
                "MAVEN", "GITHUB", "testcorp/valid-mvn", "MATCHED",
                "2", "10", "1", "Apache-2.0", "A valid maven project",
                "https://example.com", "1", "1", "1",
                json.dumps([{"Name": "testcorp:lib", "Version": "1.0.0", "RelationType": "SOURCE_REPO_TYPE"}])
            ])
            # Row 2: Empty packages (should be skipped)
            writer.writerow([
                "MAVEN", "GITHUB", "testcorp/empty-pkgs", "MATCHED",
                "0", "5", "0", "MIT", "No packages",
                "https://example.com", "0", "0", "0", "[]"
            ])
            # Row 3: Valid PYPI project
            writer.writerow([
                "PYPI", "GITHUB", "testcorp/valid-pypi", "MATCHED",
                "1", "50", "5", "BSD-3-Clause", "A valid pypi project",
                "https://example.com", "2", "2", "2",
                json.dumps([
                    {"Name": "pylib-core", "Version": "2.1.0", "RelationType": "SOURCE_REPO_TYPE"},
                    {"Name": "pylib-extra", "Version": "2.1.0", "RelationType": "SOURCE_REPO_TYPE"}
                ])
            ])
            # Row 4: Blank identity (should be skipped)
            writer.writerow([
                "", "GITHUB", "", "MATCHED",
                "0", "0", "0", "", "", "", "0", "0", "0", "[]"
            ])

        self.service = ProjectImporterService(csv_path=self.csv_file, checkpoint_path=self.checkpoint_file)

    def teardown_method(self):
        """Clean up test fixtures and test database records."""
        Project.objects.filter(project_name__startswith="testcorp/").delete()
        if self.csv_file.exists():
            self.csv_file.unlink(missing_ok=True)
        if self.checkpoint_file.exists():
            self.checkpoint_file.unlink(missing_ok=True)
        if self.tmp_dir.exists():
            try:
                self.tmp_dir.rmdir()
            except OSError:
                pass

    def test_import_next_project_service(self):
        # 1. First import should import testcorp/valid-mvn
        p1, is_end, info = self.service.import_next_project()
        assert p1 is not None
        assert is_end is False
        assert p1.project_name == "testcorp/valid-mvn"
        assert p1.ecosystem == "MAVEN"
        assert p1.package_count == 1
        assert p1.packages.count() == 1
        assert self.checkpoint_file.exists()

        # 2. Second import should skip empty-pkgs and import testcorp/valid-pypi
        p2, is_end, info = self.service.import_next_project()
        assert p2 is not None
        assert is_end is False
        assert p2.project_name == "testcorp/valid-pypi"
        assert p2.ecosystem == "PYPI"
        assert p2.package_count == 2
        assert p2.packages.count() == 2

        # 3. Third import should reach the end of the dataset
        p3, is_end, info = self.service.import_next_project()
        assert p3 is None
        assert is_end is True

        # 4. Dependency graph safety: Confirm no dependency graphs were constructed
        assert ProjectGraph.objects.filter(project__in=[p1, p2]).count() == 0

    def test_import_next_duplicate_protection(self):
        # Pre-insert testcorp/valid-mvn manually into database
        Project.objects.create(
            ecosystem="MAVEN",
            project_type="GITHUB",
            project_name="testcorp/valid-mvn",
        )

        # Calling import_next should skip testcorp/valid-mvn and pick testcorp/valid-pypi
        p, is_end, info = self.service.import_next_project()
        assert p is not None
        assert p.project_name == "testcorp/valid-pypi"

    def test_import_next_api_endpoint(self):
        client = Client()

        # Monkeypatch service paths for the view
        orig_init = ProjectImporterService.__init__

        def mock_init(inst, csv_path=None, checkpoint_path=None):
            inst.csv_path = self.csv_file
            inst.checkpoint_path = self.checkpoint_file

        ProjectImporterService.__init__ = mock_init
        try:
            # POST to /api/projects/import-next/
            res = client.post("/api/projects/import-next/")
            assert res.status_code == 201
            data = res.json()
            assert data["project"]["project_name"] == "testcorp/valid-mvn"
            assert data["is_end_of_dataset"] is False

            # Second call
            res2 = client.post("/api/projects/import-next/")
            assert res2.status_code == 201
            assert res2.json()["project"]["project_name"] == "testcorp/valid-pypi"

            # Third call: dataset exhausted
            res3 = client.post("/api/projects/import-next/")
            assert res3.status_code == 200
            assert res3.json()["is_end_of_dataset"] is True
            assert res3.json()["project"] is None
        finally:
            ProjectImporterService.__init__ = orig_init

    def test_missing_dataset_file(self):
        client = Client()
        orig_init = ProjectImporterService.__init__

        def mock_init(inst, csv_path=None, checkpoint_path=None):
            inst.csv_path = Path("non_existent_dataset.csv")
            inst.checkpoint_path = self.checkpoint_file

        ProjectImporterService.__init__ = mock_init
        try:
            res = client.post("/api/projects/import-next/")
            assert res.status_code == 404
            assert "Dataset CSV not found" in res.json()["error"]
        finally:
            ProjectImporterService.__init__ = orig_init
