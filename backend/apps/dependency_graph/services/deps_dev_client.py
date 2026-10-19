"""Client for deps.dev API v3."""

import logging
import random
import time
import urllib.parse
from typing import Any, Dict, List, Optional
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class DepsDevAPIError(Exception):
    """Base exception for deps.dev API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class DepsDevClient:
    """HTTP client for querying deps.dev API with timeouts and exponential backoff."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: float = 12.0,
        max_retries: int = 3,
        user_agent: str = "SupplyChain-RiskPlatform/1.0",
    ):
        if base_url:
            self.base_url = base_url.rstrip("/")
        elif settings.configured and hasattr(settings, "DEPS_DEV_BASE_URL"):
            self.base_url = settings.DEPS_DEV_BASE_URL.rstrip("/")
        else:
            self.base_url = "https://api.deps.dev/v3"
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": user_agent,
            "Accept": "application/json",
        })

    def fetch_dependencies(
        self,
        system: str,
        package_name: str,
        version: str,
    ) -> Dict[str, Any]:
        """Fetch resolved dependency graph for a single package version.

        Parameters
        ----------
        system : 'MAVEN' or 'PYPI'
        package_name : Package name or Maven coordinate (e.g. 'org.apache.commons:commons-lang3')
        version : Version string

        Returns
        -------
        Dict[str, Any] containing:
            - success: bool
            - status_code: int
            - status: 'COMPLETE', 'EMPTY', 'FAILED'
            - error_message: str
            - response_time_ms: float
            - nodes: list of normalized node dicts
            - edges: list of normalized edge dicts
            - raw_response: dict
        """
        sys_lower = system.strip().lower()
        # Encode package name (including colons in Maven coordinates)
        encoded_package = urllib.parse.quote(package_name.strip(), safe="")
        encoded_version = urllib.parse.quote(version.strip(), safe="")

        url = f"{self.base_url}/systems/{sys_lower}/packages/{encoded_package}/versions/{encoded_version}:dependencies"

        last_error = ""
        status_code = None
        t_start = time.time()

        for attempt in range(self.max_retries + 1):
            try:
                t0 = time.time()
                resp = self.session.get(url, timeout=self.timeout)
                elapsed_ms = round((time.time() - t0) * 1000, 2)
                status_code = resp.status_code

                if status_code == 200:
                    data = resp.json()
                    nodes = data.get("nodes", [])
                    edges = data.get("edges", [])

                    # Inspect nodes for resolution errors
                    resolution_errors = []
                    for n in nodes:
                        errs = n.get("errors")
                        if errs:
                            resolution_errors.append(f"{n.get('versionKey', {}).get('name')}: {errs}")

                    status = "COMPLETE"
                    if len(nodes) == 0:
                        status = "EMPTY"

                    return {
                        "success": True,
                        "status_code": 200,
                        "status": status,
                        "error_message": "; ".join(resolution_errors) if resolution_errors else "",
                        "response_time_ms": elapsed_ms,
                        "nodes": nodes,
                        "edges": edges,
                        "raw_response": data,
                    }

                elif status_code == 404:
                    # Package or version is not indexed in deps.dev
                    return {
                        "success": False,
                        "status_code": 404,
                        "status": "FAILED",
                        "error_message": f"Package version {package_name}@{version} not found in deps.dev (404)",
                        "response_time_ms": elapsed_ms,
                        "nodes": [],
                        "edges": [],
                        "raw_response": {},
                    }

                elif status_code in (429, 500, 502, 503, 504):
                    # Transient error, apply exponential backoff
                    last_error = f"HTTP {status_code}: {resp.text[:200]}"
                    if attempt < self.max_retries:
                        backoff = (0.5 * (2 ** attempt)) + random.uniform(0.1, 0.4)
                        logger.warning(
                            "Transient HTTP %s from deps.dev for %s@%s. Retrying in %.2fs (attempt %d/%d)...",
                            status_code,
                            package_name,
                            version,
                            backoff,
                            attempt + 1,
                            self.max_retries,
                        )
                        time.sleep(backoff)
                        continue
                    break
                else:
                    # Other client errors (400, 401, 403, etc.) - do not retry
                    last_error = f"HTTP {status_code}: {resp.text[:200]}"
                    break

            except requests.Timeout as e:
                last_error = f"Connection timeout ({self.timeout}s): {e}"
                if attempt < self.max_retries:
                    backoff = (0.5 * (2 ** attempt)) + random.uniform(0.1, 0.4)
                    time.sleep(backoff)
                    continue
                break
            except requests.RequestException as e:
                last_error = f"Request failed: {e}"
                if attempt < self.max_retries:
                    backoff = (0.5 * (2 ** attempt)) + random.uniform(0.1, 0.4)
                    time.sleep(backoff)
                    continue
                break
            except Exception as e:
                last_error = f"Unexpected error: {e}"
                break

        total_elapsed_ms = round((time.time() - t_start) * 1000, 2)
        return {
            "success": False,
            "status_code": status_code,
            "status": "FAILED",
            "error_message": last_error,
            "response_time_ms": total_elapsed_ms,
            "nodes": [],
            "edges": [],
            "raw_response": {},
        }
