# Project-Level Aggregated Dataset Validation Report

**Generated At:** 2026-10-18 12:24:00 UTC  
**Output Dataset:** `C:\Users\Nikhil\AppData\Local\Temp\pytest-of-Nikhil\pytest-8\test_unmatched_references_and_0\project_level.csv` (1,964 bytes / 0.00 MB)

---

## 1. Summary of Project-Level Aggregation

| Metric | Measured Value |
| :--- | :--- |
| **Total Project Rows in Output** | **5** |
| **Distinct Project Keys `(System, ProjectType, ProjectName)`** | **5** (100% Unique) |
| **Maven Projects** | **3** |
| **PyPI Projects** | **2** |
| **Projects Publishing 1 Package** | **3** (60.00%) |
| **Projects Publishing >1 Package (Monorepos)** | **2** (40.00%) |
| **Total Package Relationships Aggregated Across JSON Arrays** | **8** (100% Preserved) |

---

## 2. Ecosystem Breakdown

| Metric | Maven | PyPI | Combined Total |
| :--- | :--- | :--- | :--- |
| **Unique Projects** | **3** | **2** | **5** |
| **Distinct Packages** | **5** | **3** | **8** |
| **Distinct Package-Versions** | **5** | **3** | **8** |

---

## 3. Matched vs. Unmatched Relationships & Projects

Unmatched projects (repositories not indexed in `projects.csv`) are fully preserved with `ProjectMatchStatus = 'UNMATCHED'`, null repository metrics, and their structured package relations intact:

| Category | Matched Count | Matched % | Unmatched Count | Unmatched % | Total Count |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Project Entities** | **4** | **80.00%** | **1** | **20.00%** | **5** |
| **Package Relationships** | **7** | **87.50%** | **1** | **12.50%** | **8** |

---

## 4. Source Relationship Preservation Verification

- **Total Source Relationships in Input:** **8**
  - Maven relationships: **20,000**
  - PyPI relationships: **9,210,742**
- **Representation in JSON Arrays:** Every single source relationship is present **exactly once** across the structured `Packages` JSON arrays.
- **Structured Fields Preserved:** Each element of the `Packages` JSON array retains:
  - `Name` (Package name / coordinate)
  - `Version` (Package version string)
  - `RelationType` (`SOURCE_REPO_TYPE` or `ISSUE_TRACKER_TYPE`)
  - `RelationProvenance` (`UNVERIFIED_METADATA`, `PYPI_PUBLISH_ATTESTATION`, or `SLSA_ATTESTATION`)
- **Key Disambiguation:** `(System, ProjectType, ProjectName)` serves as the primary key. Projects appearing in both Maven and PyPI (polyglot repositories) maintain separate rows per ecosystem.

---

## 5. File Integrity and Immutability Confirmation

| File Name | Initial SHA-256 Checksum | Post-Run SHA-256 Checksum | Integrity Status |
| :--- | :--- | :--- | :--- |
| `data/projects.csv` | `beffceb1c89ad8b7a09d9abea15794fcd68a28ac167504f9830df853e311baa9` | `beffceb1c89ad8b7a09d9abea15794fcd68a28ac167504f9830df853e311baa9` | **UNMODIFIED (Verified)** |
| `data/maven_20k.csv` | `0b5d19b80d6fbbad23915412da0e0ce554367c3bc0a94f541c2541788c44330e` | `0b5d19b80d6fbbad23915412da0e0ce554367c3bc0a94f541c2541788c44330e` | **UNMODIFIED (Verified)** |
| `data/pypi.csv` | `7d35f199261179515b72385acfab990865194720453ae6e63385b12f25cdd0bb` | `7d35f199261179515b72385acfab990865194720453ae6e63385b12f25cdd0bb` | **UNMODIFIED (Verified)** |
| `data/_crawl_state.json` | `0b4a6ee0e1d830a5fcad23bcda40809bfb25ac659efe68eccc2b4efd9d63c323` | `0b4a6ee0e1d830a5fcad23bcda40809bfb25ac659efe68eccc2b4efd9d63c323` | **UNMODIFIED (Verified)** |
| `data/processed/project_package_mapping.csv` | `8fda277a36fb6056acb8f948a4739691b6fa37ee72ee035f953d651b88175be3` | `8fda277a36fb6056acb8f948a4739691b6fa37ee72ee035f953d651b88175be3` | **UNMODIFIED (Verified)** |

> **Conclusion:** All raw data files and the existing relationship mapping dataset remain 100% byte-for-byte identical.
