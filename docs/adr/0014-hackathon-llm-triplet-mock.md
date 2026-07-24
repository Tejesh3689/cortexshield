# 14. Hackathon LLM Triplet Mocking

Date: 2026-07-24

## Status

Accepted (Hackathon workaround)

## Context

During the hackathon build, we encountered a build failure when attempting to install `litellm` (a dependency of `cortex_healing`) in the Python 3.14 environment on Windows. `litellm` versions 1.44+ include a Rust extension (`litellm-rust`). Because there are no pre-compiled Python 3.14 wheels for this extension yet, `uv` attempts to build it from source. This fails on the local host because Visual Studio C++ Build Tools (MSVC) are not installed, resulting in an `ImportError` that silently drops memory write jobs in the background.

The host environment is pinned to Python 3.14 because standard Python 3.12 triggers a WDAC/AppLocker block on standard DLL loading (specifically `_ssl.pyd`).

## Decision

To unblock graph ingestion and testing for the hackathon without requiring native C++ build tools on the host, we have mocked the LLM triplet extraction step:

1. **Mocked Extraction**: `cortex_healing.extraction.llm_triplet_extractor.extract_triplets` has been modified to bypass `litellm` and `instructor`. It now returns a fixed, hardcoded `Triplet` regardless of the input text (`user -> favorite_color -> blue`).
2. **Dependencies Removed**: `litellm` and `instructor` were temporarily removed from the `cortex_healing` package dependencies to allow the background job processor to be imported successfully by `proxy-engine`.
3. **Real Poison Detection Retained**: The rule-based poison pre-filter (`check_poison`) and graph healing logic (`heal_graph`) are **fully real and unaffected**. They run before the mocked extraction. This allows us to fully test anomalous metadata generation (`trust_score`, `status: FLAGGED_POISON`) in Neo4j based on input text, even though the structural triplet edges themselves are hardcoded.

## Consequences

- **Pros**: The background graph writing pipeline completes successfully without native compilation errors. Neo4j correctly creates nodes and edges, allowing end-to-end integration testing of ingestion, audit logging, and trust scoring.
- **Cons**: Real factual extraction is disabled. All ingested memories will visually appear as the same static triplet in Neo4j.

## Reversion Plan (Post-Hackathon)

Post-hackathon, this mock must be removed to restore actual AI extraction. To do this:

1. Remove the mock from `llm_triplet_extractor.py` and restore the real LLM implementation using `instructor` and `litellm`.
2. Add `instructor` and `litellm` back to `apps/healing-worker/pyproject.toml`.
3. **Resolve the Build Issue**: This can be done by either:
   - **(Recommended)** Pinning the Python environment to `3.12` where pre-compiled wheels for `litellm-rust` exist, assuming the WDAC/AppLocker block can be resolved (e.g., by signing the binaries or adjusting the policy).
   - Installing the necessary MSVC Build Tools on the host so `litellm` can be compiled natively for Python 3.14.
