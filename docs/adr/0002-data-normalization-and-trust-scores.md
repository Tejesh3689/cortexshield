# ADR 0002: Data Normalization and Trust Score Conventions

## Status
Accepted

## Context & Decision
During Milestone 1, we recognized that the normalization rules for `Triplet` extraction and the trust score conventions were omitted from the main architecture blueprint, leaving downstream services (like `entity_resolution.py` and `contradiction_healer.py` in Milestone 4) vulnerable to undefined behaviors and edge cases. 

We are adopting the exact specification from the original `cortex_shield_core.py` reference implementation:

**Triplet Normalization:**
- `subject` and `object`: Lowercased and whitespace-stripped (e.g., `triplet.subject.lower().strip()`). This ensures case-insensitive matching for Neo4j entity IDs during entity resolution.
- `predicate`: Uppercased, whitespace-stripped, with spaces replaced by underscores (e.g., `triplet.predicate.upper().strip().replace(" ", "_")`). This matches Neo4j's requirement that relationship types cannot contain spaces (e.g. `"lives in"` → `"LIVES_IN"`).

**Trust Score Validation and Conventions:**
`trust_score` must strictly be a float bounded by `0.0 <= trust_score <= 1.0` inclusive. The schema validator will enforce this range, but downstream services will assume the following semantic values:
- `1.0` — Verified user-prompt origin.
- `0.8`–`0.95` — Other trusted origins (varies by connector type).
- `0.2` — Untrusted document/web-scrape origin, pre-poison-check.
- `0.05` — Downgraded after matching a poison indicator.

Two critical threshold constants (`0.1` for marking edge status as `FLAGGED_POISON` instead of `ACTIVE`, and `0.3` for the firewall's restricted-tool threshold) must be managed in the OPA policy/firewall config rather than being hardcoded into the data schema.
