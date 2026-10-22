"""Client for OSV.dev API (Open Source Vulnerabilities)."""

import logging
import random
import time
from typing import Any, Dict, List, Optional
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class OSVDevAPIError(Exception):
    """Base exception for OSV.dev API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class OSVDevClient:
    """HTTP client for querying OSV.dev version-query API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: float = 12.0,
        max_retries: int = 3,
        user_agent: str = "SupplyChain-RiskPlatform-OSV/1.0",
    ):
        if base_url:
            self.base_url = base_url.rstrip("/")
        elif hasattr(settings, "OSV_DEV_BASE_URL"):
            self.base_url = settings.OSV_DEV_BASE_URL.rstrip("/")
        else:
            self.base_url = "https://api.osv.dev/v1"

        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": user_agent,
            "Accept": "application/json",
            "Content-Type": "application/json",
        })

    @staticmethod
    def normalize_ecosystem(ecosystem: str) -> str:
        """Map internal system name (MAVEN, PYPI) to OSV ecosystem (Maven, PyPI)."""
        eco = (ecosystem or "").strip().upper()
        if eco == "MAVEN":
            return "Maven"
        if eco == "PYPI":
            return "PyPI"
        # Capitalize fallback (e.g. Npm -> npm, Go -> Go)
        return ecosystem.strip()

    @staticmethod
    def normalize_package_name(ecosystem: str, package_name: str) -> str:
        """Normalize package name according to ecosystem conventions."""
        eco = (ecosystem or "").strip().upper()
        name = (package_name or "").strip()
        if eco == "PYPI":
            # PyPI canonical names are lowercase, but OSV handles standard casing
            return name.lower()
        if eco == "MAVEN":
            # Maven names are groupId:artifactId, case-sensitive
            return name
        return name

    def query_vulnerabilities(
        self,
        ecosystem: str,
        package_name: str,
        version: str,
    ) -> List[Dict[str, Any]]:
        """Query OSV.dev for vulnerabilities affecting a specific package version.

        POST /v1/query
        Payload: {"package": {"name": package_name, "ecosystem": os_ecosystem}, "version": version}

        Returns:
            List of vulnerability advisory dicts from OSV.dev 'vulns' array.
        """
        osv_ecosystem = self.normalize_ecosystem(ecosystem)
        norm_name = self.normalize_package_name(ecosystem, package_name)
        norm_version = (version or "").strip()

        if not norm_name or not norm_version:
            logger.warning(
                "Invalid package query params: eco=%s, name=%s, version=%s",
                ecosystem,
                package_name,
                version,
            )
            return []

        url = f"{self.base_url}/query"
        payload = {
            "package": {
                "name": norm_name,
                "ecosystem": osv_ecosystem,
            },
            "version": norm_version,
        }

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                resp = self.session.post(url, json=payload, timeout=self.timeout)

                # OSV returns 200 with {"vulns": [...]} or {} if no vulns
                if resp.status_code == 200:
                    data = resp.json() or {}
                    vulns = data.get("vulns", [])
                    return vulns

                if resp.status_code in (429, 500, 502, 503, 504):
                    # Retriable server / rate-limit errors
                    wait_time = (2 ** (attempt - 1)) + random.uniform(0.1, 0.5)
                    logger.warning(
                        "OSV.dev query returned %s for %s:%s@%s. Attempt %s/%s. Retrying in %.2fs",
                        resp.status_code,
                        osv_ecosystem,
                        norm_name,
                        norm_version,
                        attempt,
                        self.max_retries,
                        wait_time,
                    )
                    time.sleep(wait_time)
                    last_error = OSVDevAPIError(
                        f"OSV.dev API error HTTP {resp.status_code}: {resp.text[:200]}",
                        status_code=resp.status_code,
                    )
                    continue

                # Non-retriable error (e.g. 400 Bad Request)
                error_msg = f"OSV.dev query returned HTTP {resp.status_code}: {resp.text[:200]}"
                logger.error(error_msg)
                raise OSVDevAPIError(error_msg, status_code=resp.status_code)

            except (requests.Timeout, requests.ConnectionError) as e:
                wait_time = (2 ** (attempt - 1)) + random.uniform(0.1, 0.5)
                logger.warning(
                    "Network error querying OSV.dev for %s:%s@%s (%s). Attempt %s/%s. Retrying in %.2fs",
                    osv_ecosystem,
                    norm_name,
                    norm_version,
                    e,
                    attempt,
                    self.max_retries,
                    wait_time,
                )
                time.sleep(wait_time)
                last_error = OSVDevAPIError(f"Network error querying OSV.dev: {str(e)}")
            except requests.RequestException as e:
                logger.error("RequestException querying OSV.dev: %s", e)
                raise OSVDevAPIError(f"OSV.dev request failed: {str(e)}")

        raise last_error or OSVDevAPIError("Failed to query OSV.dev after maximum retries")
