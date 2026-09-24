# High-Fidelity GMAT Simulator — Implementation Roadmap

**Document Version**: 1.0.0  
**Status**: Execution Plan  

---

## 🎯 Implementation Phases Overview

| Phase | Title | Priority | Core Objective | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Repository & Architecture Audit | P0 | Establish ground truth, identify gaps, define specifications | **COMPLETED** |
| **Phase 1** | Exam State Foundation & Server Clock | P0 | State machine, server-authoritative timer, event log, 3-edit rule | **IN PROGRESS** |
| **Phase 2** | Full Simulation Delivery Engine | P0 | Real backend wiring, break engine, section transitions, scratchpad | Upcoming |
| **Phase 3** | Dynamic CAT Psychometrics | P0 | Real-time EAP ability estimation, Fisher MFI, blueprint constraints | Upcoming |
| **Phase 4** | Question Pipeline & Certification | P0/P1 | Question metadata, validation rubric, certification states | Upcoming |
| **Phase 5** | Psychometric Calibration | P1 | Response collection, empirical difficulty/discrimination tuning | Upcoming |
| **Phase 6** | Dedicated Data Insights Renderers | P1 | Table Analysis, MSR, Graphics, Two-Part Analysis components | Upcoming |
| **Phase 7** | Advanced Analytics & Score Reports | P1 | Score uncertainty, ability trajectories, pacing distributions | Upcoming |
| **Phase 8** | Network Recovery & Offline Sync | P1 | Client event queue, reconnect synchronization, idempotency | Upcoming |
| **Phase 9** | BYOK AI Platform & Budget Manager | P2 | Provider abstraction, token tracking, budget limits, fallbacks | Upcoming |
| **Phase 10**| Preparation Engine Enhancement | P2 | Deep mistake book taxonomy, flashcards, study planner integration | Upcoming |
| **Phase 11**| Admin & Question Quality Dashboard | P2 | Question lifecycle management, exposure monitoring | Upcoming |
| **Phase 12**| Simulator Polish & Accessibility | P3 | Keyboard accessibility, high contrast, subtle micro-interactions | Upcoming |

---

## 📋 Phase-by-Phase Detailed Plan

### Phase 0: Repository & Architecture Audit (COMPLETED)
- [x] Comprehensive inspection of monorepo, packages, schemas, and dependencies.
- [x] Detection of core bugs: client-authoritative timer, frontend mock data disconnect, client-only 3-edit check.
- [x] Deliverable: [`docs/CURRENT_ARCHITECTURE_AUDIT.md`](file:///d:/GMAT/docs/CURRENT_ARCHITECTURE_AUDIT.md)
- [x] Deliverable: [`docs/GMAT_SIMULATION_SPEC.md`](file:///d:/GMAT/docs/GMAT_SIMULATION_SPEC.md)
- [x] Deliverable: [`docs/IMPLEMENTATION_ROADMAP.md`](file:///d:/GMAT/docs/IMPLEMENTATION_ROADMAP.md)

---

### Phase 1: Exam State Foundation & Server Clock (P0 — Highest Priority)
**Goal**: Make the exam engine deterministic, server-authoritative, and resilient against clock manipulation.

#### Tasks:
1. **Schema Enhancements (`packages/database/prisma/schema.prisma`)**:
   - Add `sectionDeadlineAt` to `ExamSection`.
   - Add `breakDeadlineAt` to `Exam`.
   - Add `ExamEvent` model with `idempotencyKey`, `sequenceNumber`, and `type`.
   - Add `ExamIntegrityEvent` model for telemetry.
2. **Centralized Types (`packages/shared/src/types.ts`)**:
   - Export `ExamState` and `ExamEventType` enums.
   - Export `ExamEvent` interface.
3. **Backend Exam Service Refactoring (`apps/api/src/modules/exam/exam.service.ts`)**:
   - Introduce `sectionDeadlineAt = startedAt + durationSeconds`.
   - Enforce deadline: reject answers, flags, or edits if `now > sectionDeadlineAt`.
   - Server-side 3-edit rule: decrement `editsRemaining` on answer modification; reject if $\le 0$.
   - Server state machine transition validator: prevent illegal transitions.
   - Record immutable `ExamEvent` entries on state changes.
4. **Backend Exam Controller Additions (`apps/api/src/modules/exam/exam.controller.ts`)**:
   - `GET /exams/:id/sync` endpoint returning server time and remaining duration.
   - `POST /exams/:id/events` for idempotent event batches.
5. **Automated Unit Tests (`apps/api/src/modules/exam/exam.service.spec.ts`)**:
   - Test deadline expiration.
   - Test 3-edit limit enforcement.
   - Test state transition validity.

---

### Phase 2: Full Simulation Delivery Engine (P0)
**Goal**: Connect the frontend exam runner to real backend APIs and enforce authentic exam pacing.

#### Tasks:
1. **Frontend Exam Runner Refactor (`apps/web/src/app/exam/[id]/page.tsx`)**:
   - Eliminate static `mockQuestions` array.
   - Fetch live exam data from `/api/v1/exams/:id`.
   - Synchronize display timer to server deadline via drift-offset calculation.
   - Submit answers to `/api/v1/exams/:id/sections/:sectionId/answer`.
2. **Break Engine**:
   - Implement backend `startBreak(examId)` and `endBreak(examId)`.
   - Enforce single break constraint (only between S1-S2 or S2-S3).
   - Auto-advance when break timer reaches 0.
3. **Scratchpad & Tooling**:
   - Question-specific digital scratchpad for mathematical notes.
   - Restrict on-screen calculator strictly to Data Insights section.

---

### Phase 3: Dynamic CAT Psychometrics (P0)
**Goal**: True adaptive test delivery with real-time EAP ability estimation and topic balance.

#### Tasks:
1. **Adaptive Item Delivery**:
   - Instead of pre-allocating all 21 questions at once, serve questions dynamically based on student's current $\hat{\theta}_{EAP}$.
2. **Content Blueprint & Shadow Constraints**:
   - Topic distribution quotas for Arithmetic, Algebra, Word Problems, and DI types.
3. **Exposure Control**:
   - Sympson-Hetter randomization to prevent item overuse.

---

### Phase 4: Question Engine & Quality Pipeline (P0/P1)
**Goal**: Multi-stage validation gate ensuring questions meet strict psychometric and clarity standards.

#### Tasks:
1. **Question Certification States**:
   - `DRAFT` $\rightarrow$ `VALIDATED` $\rightarrow$ `CERTIFIED` $\rightarrow$ `ACTIVE` $\rightarrow$ `RETIRED`.
2. **Deterministic Solver Checks**:
   - Automated mathematical verification of Quantitative equations before AI approval.
3. **Gold Standard Regression Suite**:
   - Deterministic test fixtures in `tests/gold/` for regression testing.

---

### Phase 5 to Phase 12 (Upcoming Roadmap)
* **Phase 5**: Psychometric parameter recalibration pipeline.
* **Phase 6**: Dedicated high-fidelity Data Insights renderers (Table Analysis sorting, MSR tabs, Two-Part matrix).
* **Phase 7**: Comprehensive score reporting with standard error intervals and ability trajectories.
* **Phase 8**: Client offline event queue and automatic reconnection recovery.
* **Phase 9**: BYOK AI budget tracking and cost ceilings.
* **Phase 10**: Error recovery drills and flashcard mastery analytics.
* **Phase 11**: Question quality admin dashboard.
* **Phase 12**: Minimalist test-like styling polish and full WCAG accessibility compliance.

---

## 🔒 Definition of Done for High-Fidelity Simulator

1. [ ] Server owns the timer (`sectionDeadlineAt`); client cannot forge or extend time.
2. [ ] Server strictly enforces the maximum 3-edit rule during review.
3. [ ] All 6 section order permutations are supported and immutable after start.
4. [ ] Live questions are delivered adaptively via backend IRT algorithms.
5. [ ] Break works exactly once for 10 minutes and auto-advances on timeout.
6. [ ] Browser refresh or network reconnect seamlessly restores exact exam state.
7. [ ] Data Insights features dedicated renderers for DS, MSR, TA, GI, and Two-Part.
8. [ ] Simulator scores are reported with uncertainty intervals (SEM) and disclaimers.
9. [ ] Zero dependency on external AI services for core test delivery.
10. [ ] 100% of core exam rules covered by automated tests.
