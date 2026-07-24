# ADR 0012: Documentation Framework (Milestone 9.5)

## Status
Accepted

## Context
Milestone 9.5 requires scaffolding a public-facing developer documentation site (`apps/docs-site`) containing our MCP proxy quickstart, API reference, and high-level firewall conceptual explanations. We needed to choose between Mintlify and Docusaurus.

## Decision
We selected **Docusaurus**.
While Mintlify offers exceptional out-of-the-box aesthetics, it heavily steers towards its hosted platform for full feature parity and analytics. Docusaurus is fully open-source, entirely local, and integrates flawlessly into our existing pnpm/Turborepo React monorepo architecture. It allows us to seamlessly share UI components from our `@cortexshield/ui` workspace if we choose to embed live graph components into the docs later.

## Consequences
- The docs site builds as a standard static React SPA and can be deployed anywhere (Vercel, AWS S3, GitHub Pages) without vendor lock-in.
- API references are currently maintained in Markdown, but Docusaurus supports OpenAPI plugins that we can wire directly into our FastAPI OpenAPI spec in the future.
