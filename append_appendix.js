const fs = require('fs');
const path = require('path');

const blueprintPath = 'D:\\cortexshield\\docs\\architecture\\CortexShield-Architecture-Blueprint.md';

const appendix = `
---

## Appendix A: Data Normalization and Trust Score Conventions

These rules define the strict data normalization patterns and trust score conventions to be applied across the stack.

### 1. Triplet Normalization
- **Subject & Object**: Must be lowercased and whitespace-stripped (e.g., \`triplet.subject.lower().strip()\`). This ensures case-insensitive matching for Neo4j entity IDs during the entity resolution phase.
- **Predicate**: Must be UPPERCASE, whitespace-stripped, with spaces replaced by underscores (e.g., \`triplet.predicate.upper().strip().replace(" ", "_")\`). This maps directly to Neo4j relationship types, which cannot contain spaces. (e.g., "lives in" → "LIVES_IN").

### 2. Trust Score Validation
- Trust scores must strictly be a float bounded by \`0.0 <= trust_score <= 1.0\` inclusive.
- While the schemas validate the full range, services will assume the following semantic values:
  - \`1.0\` — Verified user-prompt origin.
  - \`0.8\`–\`0.95\` — Other trusted origins (varies by connector type).
  - \`0.2\` — Untrusted document/web-scrape origin, pre-poison-check.
  - \`0.05\` — Downgraded after matching a poison indicator.
- Threshold constants (e.g., \`0.1\` for marking edge status as \`FLAGGED_POISON\`, and \`0.3\` for restricted-tool filtering) belong in the OPA policy/firewall config, not hardcoded into the data schema.
`;

fs.appendFileSync(blueprintPath, appendix);
console.log("Appended appendix to blueprint.");
