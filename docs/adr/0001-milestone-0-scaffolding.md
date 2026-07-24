# ADR 0001: Milestone 0 Scaffolding and Workspace Layout

## Status
Accepted

## Context & Decision
We needed to scaffold the CortexShield monorepo (Milestone 0) strictly adhering to the production architecture blueprint. While the prompt mandated the directory structure, the specific package manager configurations for the polyglot setup required minor elaboration. We configured a unified `pnpm-workspace.yaml` (managed by `turbo.json`) for the Next.js and TypeScript packages, and a root-level `pyproject.toml` designating a `uv` workspace for the FastAPI/worker Python applications and libraries. This ensures that dependency resolution and caching via Turborepo are centralized for the TypeScript side, while `uv` maintains a single, extremely fast lockfile for the Python services, perfectly satisfying the blueprint's "one tenant, two enforcement points" coherence requirement without splitting repos.
