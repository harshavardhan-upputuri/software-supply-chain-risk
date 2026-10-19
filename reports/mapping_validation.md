# Mapping Validation Report

**Generated At:** 2026-10-18 10:58:54 UTC  
**Pipeline Output File:** `data/processed/project_package_mapping.csv` (2,054,059,923 bytes / 1958.90 MB)

---

## 1. Summary of Execution Results

| Metric | Measured Value |
| :--- | :--- |
| **Projects Raw Input Rows (`projects.csv`)** | **5,325,252** |
| **Maven Raw Input Rows (`maven_20k.csv`)** | **20,000** |
| **PyPI Raw Input Rows (`pypi.csv`)** | **9,210,742** |
| **Total Input Package Relations** | **9,230,742** |
| **Total Output Rows in `project_package_mapping.csv`** | **9,230,742** |
| **Exact Duplicate Rows Removed** | **0** |
| **Total Distinct Upstream Projects `(ProjectType, ProjectName)`** | **584,582** |
| **Invalid Matched Records (`ProjectMatchStatus == 'MATCHED'` but missing key/metrics)** | **0** |
| **Negative Forks Sentinels Remaining in Output (`ForksCount < 0`)** | **0** (converted to NULL) |

---

## 2. Ecosystem Match Breakdown

| Ecosystem | Total Rows | Matched Rows | Matched % | Unmatched Rows | Unmatched % | Distinct Projects | Distinct Packages | Distinct Package-Versions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Maven** | 20,000 | 19,579 | 97.89% | 421 | 2.10% | 1,665 | 8,411 | 19,901 |
| **PyPI** | 9,210,742 | 8,204,191 | 89.07% | 1,006,551 | 10.93% | 582,937 | 600,381 | 7,118,059 |
| **Combined Total** | **9,230,742** | **8,223,770** | **89.09%** | **1,006,972** | **10.91%** | **584,582** | **608,792** | **7,137,960** |

---

## 3. Key Integrity and Disambiguation Verification

- **Composite Key Match:** Every row was joined strictly on `(ProjectType, ProjectName) = (Type, Name)`.
- **Validation of Matched Rows:** Exactly **0** matched rows have missing project types, missing project names, or null repository metrics. Every record marked `ProjectMatchStatus = 'MATCHED'` links to a confirmed project in `projects.csv`.
- **Sentinel Conversion:** In `projects.csv`, 28 records contain `ForksCount = -1`. In the output dataset, exactly **0** negative values exist; all sentinels have been cleanly converted to `NULL` (empty field in CSV).
- **Unmatched Preservation:** All 1,006,972 unmatched package-project relations are preserved with their original package names, versions, relation types, and provenances, with project metrics set to `NULL` and `ProjectMatchStatus = 'UNMATCHED'`.

---

## 4. Raw File Immutability Confirmation

Every raw input dataset was checked with SHA-256 before and after pipeline execution:

| File Name | Pre-Run SHA-256 Checksum | Post-Run SHA-256 Checksum | Integrity Status |
| :--- | :--- | :--- | :--- |
| `data/projects.csv` | `beffceb1c89ad8b7a09d9abea15794fcd68a28ac167504f9830df853e311baa9` | `beffceb1c89ad8b7a09d9abea15794fcd68a28ac167504f9830df853e311baa9` | UNMODIFIED (Verified) |
| `data/maven_20k.csv` | `0b5d19b80d6fbbad23915412da0e0ce554367c3bc0a94f541c2541788c44330e` | `0b5d19b80d6fbbad23915412da0e0ce554367c3bc0a94f541c2541788c44330e` | UNMODIFIED (Verified) |
| `data/pypi.csv` | `7d35f199261179515b72385acfab990865194720453ae6e63385b12f25cdd0bb` | `7d35f199261179515b72385acfab990865194720453ae6e63385b12f25cdd0bb` | UNMODIFIED (Verified) |
| `data/_crawl_state.json` | `0b4a6ee0e1d830a5fcad23bcda40809bfb25ac659efe68eccc2b4efd9d63c323` | `0b4a6ee0e1d830a5fcad23bcda40809bfb25ac659efe68eccc2b4efd9d63c323` | UNMODIFIED (Verified) |

> **Conclusion:** Raw datasets remain completely untouched and identical to their original state.

---

## 5. Output Data Samples

### Sample Matched Records
```text
(datetime.datetime(2026, 9, 21, 21, 0, 59, 824814), 'GITHUB', 'cdk8s-team/cdk8s-cdktf-resolver', 9, 1, 'PYPI', 'cdk8s-cdktf-resolver', '0.0.30', 'MATCHED')
(datetime.datetime(2026, 9, 21, 21, 0, 59, 824814), 'GITHUB', 'aliymn/conventional-commits-check', 15, 2, 'PYPI', 'conventional-commits-check', '1.0.1', 'MATCHED')
(datetime.datetime(2026, 9, 21, 21, 0, 59, 824814), 'GITHUB', 'negu93/cvnn', 198, 35, 'PYPI', 'cvnn', '1.1.64', 'MATCHED')
```

### Sample Unmatched Records
```text
(datetime.datetime(2026, 9, 21, 21, 0, 59, 824814), 'GITHUB', 'yourusername/internetnamesmcp', None, None, 'PYPI', 'internet-names-mcp', '0.1.2', 'UNMATCHED')
(datetime.datetime(2026, 9, 21, 21, 0, 59, 824814), 'GITHUB', 'strands-agents/agent-sop', None, None, 'PYPI', 'strands-agents-sops', '1.0.4', 'UNMATCHED')
(datetime.datetime(2026, 9, 21, 21, 0, 59, 824814), 'GITHUB', 'carnegierobotics/logqs-client', None, None, 'PYPI', 'lqs-client', '0.1.12', 'UNMATCHED')
```
