"""Django management command to stream and import projects from CSV dataset."""

import csv
import json
import os
import sys
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.dependency_graph.models import Project, ProjectPackage


class Command(BaseCommand):
    help = "Import projects and their package relationships from project_level_dataset.csv"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            default="data/processed/project_level_dataset.csv",
            help="Path to project_level_dataset.csv relative to repo root",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limit the number of projects to import (e.g. 10)",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Batch size for database bulk operations",
        )

    def handle(self, *args, **options):
        file_path_str = options["file"]
        limit = options["limit"]
        batch_size = options["batch_size"]

        # Resolve CSV path
        csv_path = Path(file_path_str)
        if not csv_path.is_absolute():
            # If relative, resolve against repo root
            from django.conf import settings

            csv_path = (settings.REPO_ROOT / csv_path).resolve()

        if not csv_path.exists():
            raise CommandError(f"Dataset CSV not found at: {csv_path}")

        self.stdout.write(f"Reading dataset from: {csv_path}")
        if limit:
            self.stdout.write(f"Target limit: {limit} projects (balanced across ecosystems)")

        # Configure safe field size limit for Windows
        max_int = sys.maxsize
        while True:
            try:
                csv.field_size_limit(max_int)
                break
            except OverflowError:
                max_int = int(max_int / 10)

        imported_count = 0
        updated_count = 0
        skipped_count = 0
        failed_count = 0
        selected_projects_info = []

        if limit is not None and limit > 0:
            # Deterministic, balanced selection of suitable projects
            # Target half Maven, half PyPI
            maven_target = limit // 2
            pypi_target = limit - maven_target
            selected_rows = []
            maven_collected = 0
            pypi_collected = 0

            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    sys_name = (row.get("System") or "").strip().upper()
                    pkg_cnt_str = (row.get("PackageCount") or "").strip()
                    pkg_cnt = int(pkg_cnt_str) if pkg_cnt_str.isdigit() else 0

                    # Prefer projects with a small number of packages (1-3)
                    if 1 <= pkg_cnt <= 3:
                        if sys_name == "MAVEN" and maven_collected < maven_target:
                            selected_rows.append(row)
                            maven_collected += 1
                        elif sys_name == "PYPI" and pypi_collected < pypi_target:
                            selected_rows.append(row)
                            pypi_collected += 1

                    if maven_collected >= maven_target and pypi_collected >= pypi_target:
                        break

            # If small packages did not fill target, collect remaining
            if len(selected_rows) < limit:
                with open(csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        sys_name = (row.get("System") or "").strip().upper()
                        if row in selected_rows:
                            continue
                        if sys_name == "MAVEN" and maven_collected < maven_target:
                            selected_rows.append(row)
                            maven_collected += 1
                        elif sys_name == "PYPI" and pypi_collected < pypi_target:
                            selected_rows.append(row)
                            pypi_collected += 1
                        if maven_collected >= maven_target and pypi_collected >= pypi_target:
                            break

            rows_to_process = selected_rows
        else:
            # Full dataset generator
            def row_generator():
                with open(csv_path, "r", encoding="utf-8") as f:
                    for r in csv.DictReader(f):
                        yield r

            rows_to_process = row_generator()

        # Process rows
        for row in rows_to_process:
            try:
                system = (row.get("System") or "").strip().upper()
                project_name = (row.get("ProjectName") or "").strip()
                project_type = (row.get("ProjectType") or "").strip()
                match_status = (row.get("ProjectMatchStatus") or "").strip()

                if not system or not project_name:
                    skipped_count += 1
                    continue

                def parse_int(val):
                    val = (val or "").strip()
                    return int(val) if val.isdigit() else None

                open_issues = parse_int(row.get("OpenIssuesCount"))
                stars = parse_int(row.get("StarsCount"))
                forks = parse_int(row.get("ForksCount"))
                pkg_count = parse_int(row.get("PackageCount")) or 0
                ver_count = parse_int(row.get("VersionCount")) or 0
                rel_count = parse_int(row.get("RelationshipCount")) or 0

                licenses = (row.get("Licenses") or "").strip()
                description = (row.get("Description") or "").strip()
                homepage = (row.get("Homepage") or "").strip()

                packages_raw = row.get("Packages") or "[]"
                try:
                    packages_data = json.loads(packages_raw)
                except Exception:
                    packages_data = []

                with transaction.atomic():
                    project, created = Project.objects.update_or_create(
                        ecosystem=system,
                        project_name=project_name,
                        defaults={
                            "project_type": project_type,
                            "project_match_status": match_status,
                            "open_issues_count": open_issues,
                            "stars_count": stars,
                            "forks_count": forks,
                            "licenses": licenses,
                            "description": description,
                            "homepage": homepage,
                            "package_count": pkg_count,
                            "version_count": ver_count,
                            "relationship_count": rel_count,
                        },
                    )

                    if created:
                        imported_count += 1
                    else:
                        updated_count += 1

                    # Recreate original packages list idempotently
                    ProjectPackage.objects.filter(project=project).delete()
                    pkg_objs = []
                    for p in packages_data:
                        p_name = p.get("Name", "").strip()
                        p_ver = p.get("Version", "").strip()
                        if p_name and p_ver:
                            pkg_objs.append(
                                ProjectPackage(
                                    project=project,
                                    package_name=p_name,
                                    version=p_ver,
                                    relation_type=p.get("RelationType", "").strip(),
                                    relation_provenance=p.get("RelationProvenance", "").strip(),
                                )
                            )
                    if pkg_objs:
                        ProjectPackage.objects.bulk_create(pkg_objs, ignore_conflicts=True)

                    selected_projects_info.append({
                        "id": project.id,
                        "ecosystem": project.ecosystem,
                        "project_name": project.project_name,
                        "project_type": project.project_type,
                        "package_count": len(pkg_objs),
                        "packages": [f"{pkg.package_name}@{pkg.version}" for pkg in pkg_objs],
                    })

            except Exception as e:
                failed_count += 1
                self.stderr.write(f"Failed to process project {row.get('ProjectName')}: {e}")

        # Summary output
        self.stdout.write(self.style.SUCCESS("\n--- Import Summary ---"))
        self.stdout.write(f"Imported (new): {imported_count}")
        self.stdout.write(f"Updated:        {updated_count}")
        self.stdout.write(f"Skipped:        {skipped_count}")
        self.stdout.write(f"Failed:         {failed_count}")
        self.stdout.write(f"Total processed: {imported_count + updated_count}\n")

        if selected_projects_info:
            self.stdout.write(self.style.SUCCESS("--- Selected Projects ---"))
            for p in selected_projects_info:
                self.stdout.write(
                    f"[ID: {p['id']}] {p['ecosystem']:<6} | {p['project_name']:<45} | "
                    f"Packages: {p['package_count']} -> {', '.join(p['packages'][:3])}"
                )
