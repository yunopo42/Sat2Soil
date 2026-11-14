import re
from pathlib import Path

import pytest

from app.models.data_source import DataSource

CONTRACT_FILE = (
    Path(__file__).resolve().parents[3] / "packages" / "contracts" / "src" / "data-source.ts"
)


def test_python_enum_matches_typescript_contract() -> None:
    """D-001: the API and the web app must agree on the data source list, in order."""
    if not CONTRACT_FILE.exists():
        pytest.skip("packages/contracts is not available (API checked out on its own)")

    source = CONTRACT_FILE.read_text(encoding="utf-8")
    block = re.search(r"DATA_SOURCES\s*=\s*\[(.*?)\]\s*as const", source, re.DOTALL)
    assert block, "DATA_SOURCES array not found in the TypeScript contract"

    typescript_values = re.findall(r'"([a-z_]+)"', block.group(1))
    assert typescript_values == [member.value for member in DataSource]
