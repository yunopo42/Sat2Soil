from enum import StrEnum


class DataSource(StrEnum):
    """Canonical provenance of every value Sat2Soil serves (docs/DECISIONS.md D-001).

    Mirrors `packages/contracts/src/data-source.ts`; tests/test_data_source_contract.py keeps
    both lists identical and in the same order. `actual_device_future` is reserved and
    deliberately absent until a real AgriSpray device exists.
    """

    LIVE_NASA = "live_nasa"
    CACHED_NASA = "cached_nasa"
    DEMO_SAMPLE = "demo_sample"
    MANUAL_USER = "manual_user"
    SIMULATED_DEVICE = "simulated_device"
    DERIVED_INDICATOR = "derived_indicator"
    SCENARIO_ESTIMATE = "scenario_estimate"
    UNAVAILABLE = "unavailable"
