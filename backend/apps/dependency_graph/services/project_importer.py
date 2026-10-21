"""Service for streaming and importing individual projects from project_level_dataset.csv."""

import csv
import io
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from django.conf import settings
from django.db import IntegrityError, transaction

from ..models import Project, ProjectPackage

logger = logging.getLogger(__name__)

CHECKPOINT_FILENAME = ".import_checkpoint.json"


def _configure_csv_field_size_limit():
    """Ensure safe csv field size limit across Windows and POSIX."""
    max_int = sys.maxsize
    while True:
        try:
            csv.field_size_limit(max_int)
            break
        except OverflowError:
            max_int = int(max_int / 10)


_configure_csv_field_size_limit()


class ProjectImporterService:
    """Manages memory-efficient, resumable one-by-one project imports from the large dataset CSV."""

    def __init__(self, csv_path: Optional[Path] = None, checkpoint_path: Optional[Path] = None):
        if csv_path is None:
            # Default dataset path relative to repository root
            csv_path = settings.REPO_ROOT / "data" / "processed" / "project_level_dataset.csv"
        self.csv_path = Path(csv_path).resolve()

        if checkpoint_path is None:
            self.checkpoint_path = self.csv_path.parent / CHECKPOINT_FILENAME
        else:
            self.checkpoint_path = Path(checkpoint_path).resolve()

    def get_checkpoint(self) -> Dict[str, Any]:
        """Read the persistent byte offset and row index checkpoint."""
        if not self.checkpoint_path.exists():
            return {"byte_offset": 0, "rows_scanned": 0, "projects_imported": 0}
        try:
            with open(self.checkpoint_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "byte_offset": int(data.get("byte_offset", 0)),
                    "rows_scanned": int(data.get("rows_scanned", 0)),
                    "projects_imported": int(data.get("projects_imported", 0)),
                }
        except Exception as e:
            logger.warning("Failed to read checkpoint at %s, resetting: %s", self.checkpoint_path, e)
            return {"byte_offset": 0, "rows_scanned": 0, "projects_imported": 0}

    def save_checkpoint(self, byte_offset: int, rows_scanned: int, projects_imported: int):
        """Atomically persist checkpoint to disk."""
        data = {
            "byte_offset": byte_offset,
            "rows_scanned": rows_scanned,
            "projects_imported": projects_imported,
        }
        temp_file = self.checkpoint_path.with_suffix(".tmp")
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            temp_file.replace(self.checkpoint_path)
        except Exception as e:
            logger.error("Failed to save checkpoint to %s: %s", self.checkpoint_path, e)
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass

    def import_next_project(self) -> Tuple[Optional[Project], bool, Dict[str, Any]]:
        """Find and import exactly one eligible unimported project from the CSV.

        Returns:
            (project_instance, is_end_of_dataset, info_dict)
        """
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Dataset CSV not found at: {self.csv_path}")

        checkpoint = self.get_checkpoint()
        byte_offset = checkpoint["byte_offset"]
        rows_scanned = checkpoint["rows_scanned"]
        projects_imported = checkpoint["projects_imported"]

        file_size = self.csv_path.stat().st_size
        if byte_offset >= file_size:
            return None, True, {
                "message": "All eligible projects in the dataset have already been scanned.",
                "rows_scanned": rows_scanned,
                "projects_imported": projects_imported,
            }

        with open(self.csv_path, "r", encoding="utf-8", newline="") as f:
            # 1. Read header line
            header_line = f.readline()
            header = list(csv.reader(io.StringIO(header_line)))[0]
            header_end_pos = f.tell()

            # Ensure seek position is at least after the header
            current_pos = max(byte_offset, header_end_pos)
            f.seek(current_pos)

            # Pre-load existing (ecosystem, project_name) pairs from DB for fast in-memory check
            existing_identities = set(
                Project.objects.values_list("ecosystem", "project_name")
            )

            while True:
                row_start_offset = f.tell()
                if row_start_offset >= file_size:
                    # Reached end of file
                    self.save_checkpoint(file_size, rows_scanned, projects_imported)
                    return None, True, {
                        "message": "All eligible projects in the dataset have been scanned.",
                        "rows_scanned": rows_scanned,
                        "projects_imported": projects_imported,
                    }

                # Read multi-line record safely chunk by chunk
                record_buffer = ""
                record_row = None
                while True:
                    chunk = f.readline()
                    if not chunk:
                        break
                    record_buffer += chunk
                    try:
                        parsed = list(csv.reader(io.StringIO(record_buffer)))
                        if parsed and len(parsed[0]) == len(header):
                            record_row = parsed[0]
                            break
                    except Exception:
                        continue

                row_end_offset = f.tell()
                if record_row is None:
                    # End of file or incomplete row at end
                    self.save_checkpoint(file_size, rows_scanned, projects_imported)
                    return None, True, {
                        "message": "End of dataset reached.",
                        "rows_scanned": rows_scanned,
                        "projects_imported": projects_imported,
                    }

                rows_scanned += 1
                row_data = dict(zip(header, record_row))

                # Validate identity fields
                system = (row_data.get("System") or "").strip().upper()
                project_name = (row_data.get("ProjectName") or "").strip()
                project_type = (row_data.get("ProjectType") or "").strip()

                if not system or not project_name:
                    # Invalid or blank identity, skip and advance checkpoint
                    continue

                # Check if already present in database
                if (system, project_name) in existing_identities:
                    continue

                # Validate packages requirement: project must have at least 1 valid package
                packages_raw = row_data.get("Packages") or "[]"
                try:
                    packages_data = json.loads(packages_raw)
                except Exception:
                    packages_data = []

                valid_packages = [
                    p for p in packages_data
                    if isinstance(p, dict) and p.get("Name", "").strip() and p.get("Version", "").strip()
                ]

                # Project must have valid packages to be eligible
                if not valid_packages:
                    continue

                # Parse numeric fields safely
                def parse_int(val):
                    val = (val or "").strip()
                    return int(val) if val.isdigit() else None

                open_issues = parse_int(row_data.get("OpenIssuesCount"))
                stars = parse_int(row_data.get("StarsCount"))
                forks = parse_int(row_data.get("ForksCount"))
                pkg_count = len(valid_packages)
                ver_count = parse_int(row_data.get("VersionCount")) or len(set(p.get("Version") for p in valid_packages))
                rel_count = parse_int(row_data.get("RelationshipCount")) or len(packages_data)

                match_status = (row_data.get("ProjectMatchStatus") or "").strip()
                licenses = (row_data.get("Licenses") or "").strip()
                description = (row_data.get("Description") or "").strip()
                homepage = (row_data.get("Homepage") or "").strip()

                # Attempt atomic ingestion
                try:
                    with transaction.atomic():
                        # Concurrency protection: check or create
                        if Project.objects.filter(ecosystem=system, project_name=project_name).exists():
                            # Another process inserted it simultaneously
                            existing_identities.add((system, project_name))
                            continue

                        project = Project.objects.create(
                            ecosystem=system,
                            project_type=project_type,
                            project_name=project_name,
                            project_match_status=match_status,
                            open_issues_count=open_issues,
                            stars_count=stars,
                            forks_count=forks,
                            licenses=licenses,
                            description=description,
                            homepage=homepage,
                            package_count=pkg_count,
                            version_count=ver_count,
                            relationship_count=rel_count,
                        )

                        pkg_objs = [
                            ProjectPackage(
                                project=project,
                                package_name=p["Name"].strip(),
                                version=p["Version"].strip(),
                                relation_type=p.get("RelationType", "").strip(),
                                relation_provenance=p.get("RelationProvenance", "").strip(),
                            )
                            for p in valid_packages
                        ]
                        ProjectPackage.objects.bulk_create(pkg_objs, ignore_conflicts=True)

                    # Successfully imported! Save checkpoint to resume from the next byte
                    projects_imported += 1
                    self.save_checkpoint(row_end_offset, rows_scanned, projects_imported)

                    return project, False, {
                        "message": f"Project imported successfully: {project.project_name}",
                        "rows_scanned": rows_scanned,
                        "projects_imported": projects_imported,
                    }

                except IntegrityError as ie:
                    # Duplicate inserted concurrently
                    logger.info("Project %s:%s already exists (concurrent insert): %s", system, project_name, ie)
                    existing_identities.add((system, project_name))
                    continue
                except Exception as e:
                    # Database failure: do not advance checkpoint past this un-imported row!
                    logger.error("Failed to import project %s:%s: %s", system, project_name, e)
                    raise e
