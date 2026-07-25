# CortexShield Submission Logistics & Event Checklist

> **IMPORTANT**: This document summarizes the official submission logistics, deadline tracking, demonstration format guidelines, and required upload artifacts for the CortexShield judging panel.

---

## 1. Submission Deadline & Timeline
* **Target Submission Deadline**: **July 25, 2026 at 23:59 UTC / 11:59 PM EST**
* **Status**: **READY FOR FINAL SUBMISSION**
* **Repository State**: Live database telemetry active (Neon Postgres + Neo4j Aura cloud graph), type-checked, and synced to `main` branch.

---

## 2. Demonstration Format Requirements
Both **Live Interactive Demonstration** and **Video Submission** are fully supported and prepared:

### **A. Live Judge Demonstration (Recommended)**
* **URL / Local App**: `http://localhost:6001` (Portal-Web Next.js Dashboard)
* **Key Live Visual Demonstrations**:
  1. **Memory Graph Page (`/dashboard/graph`)**:
     * **Poisoned Edge Diagnostic**: Show green entity nodes (`user`, `blue`) connected by a **Vibrant Red Edge** representing the `FLAGGED_POISON` relationship (`trust_score: 0.04`).
     * **Parallel Curved Arcs**: Point out the 3 distinct parallel curved relationships between `user` and `blue` (2 Active Green, 1 Flagged Red) without visual overlap.
     * **Hover Tooltips**: Hover over the red edge to display the live `trust_score` and status inspector.
  2. **Audit Logs Page (`/dashboard/audit-logs`)**:
     * **Cryptographic Provenance Ledger**: Show live rows fetched directly from Neon Postgres (`audit_log_index`).
     * **Visual Hash-Chain Linkage**: Highlight how `this_hash` of row $N$ matches `prev_hash` of row $N+1$, demonstrating tamper-evident provenance.
  3. **Overview Page (`/dashboard/overview`)**:
     * **Live Telemetry & Default Counters**: Demonstrates dynamic real-time traffic tracking starting from baseline values.

### **B. Prerecorded Video Submission (Backup / Platform Requirement)**
* **Recommended Video Length**: **2 to 3 minutes**
* **Screen Recording Highlights**:
  * `0:00 - 0:45`: Project overview & CortexShield memory firewall architecture.
  * `0:45 - 1:45`: Memory Graph live demonstration showing dynamic edge-poisoning detection and parallel curved links.
  * `1:45 - 2:30`: Audit Logs cryptographic hash-chain inspection & live database status confirmation.
  * `2:30 - 3:00`: Summary of Neo4j Aura + Neon Postgres infrastructure.

---

## 3. Required Upload Format & Platform Packaging

| Component | Format / Asset | Platform Location |
| :--- | :--- | :--- |
| **Source Code Repository** | Public GitHub / GitLab Repo | `https://github.com/Tejesh3689/cortexshield` |
| **Active Branch** | Git Branch `main` | Clean commit history with full type safety (`tsc --noEmit`) |
| **Environment Configuration** | `.env.example` | Included in root directory with cloud connection templates |
| **Architecture Documentation** | Markdown (`docs/architecture/`) | `CortexShield-Architecture-Blueprint.md` |
| **Video Demonstration** | MP4 Video (1080p) or Loom Link | Attach to Devpost / Submission Portal |

---

## 4. Final Submission Checklist
- [x] **Code Quality**: Passed `npx tsc --noEmit` with zero errors.
- [x] **Live Cloud DBs**: Connected to Neon Postgres (`neondb`) and Neo4j Aura (`neo4j+s`).
- [x] **Visual Clarity**: Dual Legend (Node Status vs Relationship Edge Status) active.
- [x] **Git Repository**: Pushed to `origin/main`.
